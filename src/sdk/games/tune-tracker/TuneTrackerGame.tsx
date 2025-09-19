// TuneTrackerGame.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { View, useWindowDimensions, Text, TouchableOpacity, StyleSheet, Animated } from "react-native"
import { Canvas, Path, Skia, vec, Line, Fill, Rect } from "@shopify/react-native-skia"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"

import { Audio } from "expo-av"
import { encode as btoa } from "base-64"

import { useGlobalPitchDetection } from "@/hooks/useGlobalPitchDetection"
import { useGameScreenMicrophone } from "@/hooks/useGameScreenMicrophone"
import { useUiStore } from "@/stores/uiStore"
import RequireMicAccess from "@/components/RequireMicAccess"
import { GuitarHarmonics } from "@/utils/GuitarHarmonics"
import { NOTE_FREQUENCIES } from "@/utils/noteParser"
import DSPModule from "@/../specs/NativeDSPModule"
import { handleGameExit } from "@/utils/gameNavigation"
import { calculateNoteAccuracy, calculateOverallAccuracy } from "@/utils/pitchAccuracy"
import { GameMenu, GameOverScreen, type Difficulty, type BPM, type GameStats } from '../shared/components'
import GameState from "../../../services/GameState"
import GameScore from "../../../services/GameScore"

// ---------- constants ----------
const PIXELS_PER_SECOND = 60
const PIXELS_PER_MS = PIXELS_PER_SECOND / 1000
const MAX_PITCH_POINTS = 100
const POINT_LIFETIME_MS = 8000
const START_OFFSET_MS = 600
const VISIBLE_MARGIN_PX = 800
const MIN_NOTE_MS = 20 // minimum note duration to avoid zero-width segments

// Noise reduction parameters (from Tuneo)
const MIN_FREQ = 60
const MAX_FREQ = 6000
const MAX_PITCH_DEV = 0.2
const THRESHOLD_DEFAULT = 0.15
const THRESHOLD_NOISY = 0.6
const RMS_GAP = 1.1
const ENABLE_FILTER = true

// Difficulty settings for frequency tolerance (for green color indication)
const DIFFICULTY_TOLERANCE = {
  easy: 10,    // ±10Hz tolerance for green color
  medium: 7,   // ±7Hz tolerance for green color  
  hard: 4      // ±4Hz tolerance for green color
}

// Enhanced tolerance states with colors
const getToleranceState = (diff: number, tolerance: number) => {
  if (diff <= tolerance) return 'perfect' // Within green tolerance
  if (diff <= tolerance * 1.5) return 'close' // Close but not green
  if (diff <= tolerance * 2.5) return 'fair' // Getting warmer
  return 'poor' // Far off
}

const TOLERANCE_COLORS = {
  perfect: { bg: 'rgba(34, 197, 94, 0.95)', border: '#22C55E', text: '#000', glow: '#22C55E' },
  close: { bg: 'rgba(251, 191, 36, 0.9)', border: '#FBBF24', text: '#000', glow: '#FBBF24' },
  fair: { bg: 'rgba(249, 115, 22, 0.9)', border: '#F97316', text: '#FFF', glow: '#F97316' },
  poor: { bg: 'rgba(239, 68, 68, 0.9)', border: '#EF4444', text: '#FFF', glow: '#EF4444' }
}

// Difficulty settings for accuracy calculation (wider tolerance for accuracy scoring)
const ACCURACY_TOLERANCE = {
  easy: 20,    // ±20Hz for accuracy calculation
  medium: 15,  // ±15Hz for accuracy calculation
  hard: 8      // ±8Hz for accuracy calculation
}

const PIANO_NOTES = [
  "C6","B5","A#5","A5","G#5","G5","F#5","F5","E5","D#5","D5","C#5","C5",
  "B4","A#4","A4","G#4","G4","F#4","F4","E4","D#4","D4","C#4","C4",
  "B3","A#3","A3","G#3","G3","F#3","F3","E3","D#3","D3","C#3","C3",
  "B2","A#2","A2","G#2","G2","F#2","F2","E2","D#2","D2","C#2","C2"
]

const NOTE_FREQUENCIES_MAP = NOTE_FREQUENCIES

// ---------- helper: wav tone generator for fallback ----------
function generateToneWavDataUri(frequency: number, durationMs: number, sampleRate = 44100, volume = 0.5) {
  const durationSeconds = Math.max(0.03, durationMs / 1000)
  const totalSamples = Math.floor(sampleRate * durationSeconds)
  const numChannels = 1
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = totalSamples * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  let offset = 0
  function writeString(s: string) { for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i)) }

  writeString("RIFF")
  view.setUint32(offset, 36 + dataSize, true); offset += 4
  writeString("WAVE")
  writeString("fmt ")
  view.setUint32(offset, 16, true); offset += 4
  view.setUint16(offset, 1, true); offset += 2
  view.setUint16(offset, numChannels, true); offset += 2
  view.setUint32(offset, sampleRate, true); offset += 4
  view.setUint32(offset, byteRate, true); offset += 4
  view.setUint16(offset, blockAlign, true); offset += 2
  view.setUint16(offset, bytesPerSample * 8, true); offset += 2
  writeString("data")
  view.setUint32(offset, dataSize, true); offset += 4

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate
    const s1 = Math.sin(2 * Math.PI * frequency * t)
    const s2 = 0.35 * Math.sin(2 * Math.PI * frequency * 2 * t)
    const s3 = 0.12 * Math.sin(2 * Math.PI * frequency * 3 * t)
    let sample = (s1 + s2 + s3) * (volume * 0.9)
    const attack = Math.min(0.02, durationSeconds * 0.2)
    const release = Math.min(0.03, durationSeconds * 0.25)
    let amp = 1.0
    if (t < attack) amp = t / attack
    else if (t > durationSeconds - release) amp = Math.max(0, (durationSeconds - t) / release)
    sample *= amp
    const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF
    view.setInt16(offset, Math.floor(intSample), true)
    offset += 2
  }

  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, Array.prototype.slice.call(chunk))
  }
  const base64 = btoa(binary)
  return `data:audio/wav;base64,${base64}`
}

// ---------- component ----------
interface TuneTrackerGameProps {
  notes?: any;
}

export const TuneTrackerGame = ({ notes }: TuneTrackerGameProps) => {
  const { width, height } = useWindowDimensions()
  const navigation = useNavigation()
  const route = useRoute()
  
  // Get game params from route (payload contains gameId, contentId, etc.)
  const { payload } = route.params as any || {}
  
  // Extract gameId and contentId from payload
  const gameId = payload?.gameId
  const contentId = payload?.contentId
  
  // Use payload notes if available, otherwise use props
  const gameNotes = payload?.notes || notes

  // GameState management
  const gameStateRef = useRef<GameState | null>(null)
  
  // Initialize GameState (without start time - that's set when game actually starts)
  const initializeGameState = useCallback(() => {
    const gameState = new GameState()
    gameState.setGameId(gameId || 'tune-tracker-default')
    gameState.setContentId(contentId || 'default-content')
    gameState.setGameType('tune-tracker')
    gameStateRef.current = gameState
    
    console.log('🎮 TuneTracker: GameState initialized', {
      gameId: gameState.getGameId(),
      contentId: gameState.getContentId()
    })
  }, [gameId, contentId])

  // Submit game score
  const submitGameScore = useCallback(async () => {
    if (!gameStateRef.current) {
      console.warn('🎮 TuneTracker: No GameState found, skipping score submission')
      return
    }

    try {
      // Update final game state (end time is set by caller before calling this)
      const gameState = gameStateRef.current
      gameState.setScore(score)
      gameState.setNumberOfCycles(completedCycles)
      gameState.setAccuracy(getOverallAccuracy() || 0)
      gameState.setLevelConfig({
        level: difficulty,
        bpm: bpm
      })

      console.log('🎮 TuneTracker: Submitting score...', {
        score,
        accuracy: getOverallAccuracy(),
        cycles: completedCycles,
        difficulty,
        bpm,
        gameId: gameState.getGameId(),
        contentId: gameState.getContentId(),
        startTime: gameState.getStartTime(),
        endTime: gameState.getEndTime(),
        levelConfig: gameState.getLevelConfig()
      })

      // Create and submit GameScore
      const gameScore = await GameScore.create(gameState)
      const result = await gameScore.submitToAPI()
      
      if (result.success) {
        console.log('✅ TuneTracker: Score submitted successfully')
      } else {
        console.error('❌ TuneTracker: Score submission failed:', result.error)
      }
      
      return result
    } catch (error) {
      console.error('❌ TuneTracker: Error submitting score:', error)
      return { success: false, error: error.message }
    }
  }, [score, completedCycles, getOverallAccuracy, difficulty, bpm])

  // microphone access via game screen hook
  const gameScreenMicrophone = useGameScreenMicrophone()
  
  // pitch detection data
  const {
    audioBuffer,
    sampleRate,
    bufferId,
  } = useGlobalPitchDetection()
  
  const isActive = gameScreenMicrophone.isActive
  const micAccess = gameScreenMicrophone.micAccess

  // stores
  const idQ = useUiStore((s) => s.idHistory)
  const pitchQ = useUiStore((s) => s.pitchHistory)
  const rmsQ = useUiStore((s) => s.rmsHistory)
  const addPitch = useUiStore((s) => s.addPitch)
  const addRMS = useUiStore((s) => s.addRMS)
  const addId = useUiStore((s) => s.addId)

  // state
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameOver'>('menu')
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [pitch, setPitch] = useState(-1)
  const [score, setScore] = useState(0)
  const [completedCycles, setCompletedCycles] = useState(0)
  const [noteAccuracies, setNoteAccuracies] = useState<number[]>([])
  const [cycleAccuracies, setCycleAccuracies] = useState<number[]>([])
  
  // Note and cycle tracking
  const [completedNotes, setCompletedNotes] = useState<Set<string>>(new Set())
  const [currentNoteInTolerance, setCurrentNoteInTolerance] = useState<string | null>(null)
  const toleranceStartTime = useRef<number | null>(null)
  
  // Visual feedback animations
  // const noteCompletionAnim = useRef(new Animated.Value(0)).current
  // const toleranceGlowAnim = useRef(new Animated.Value(0)).current
  const [recentlyCompletedNote, setRecentlyCompletedNote] = useState<string | null>(null)

  
  
  // Falling sparkles when voice is in range
  // const [fallingSparkles, setFallingSparkles] = useState<{
  //   id: string
  //   x: number
  //   y: number
  //   opacity: Animated.Value
  //   animatedY?: Animated.Value
  //   color: string
  //   size: number
  //   createdAt: number
  // }[]>([])
  

  // Note completion based on note width/duration from payload
  const getRequiredToleranceTime = useCallback((noteId: string): number => {
    // Find the segment for this unique noteId to get its duration
    const segment = targetSegments.find(seg => seg.noteId === noteId)
    if (!segment || !segment.duration) return 500 // fallback
    
    // Require singing for a percentage of the note's duration
    // For example: 60% of the note's duration
    const completionPercentage = 0.6
    return Math.max(200, segment.duration * completionPercentage) // minimum 200ms
  }, [targetSegments])

  
  // Accuracy sampling for FlappyBird-style calculation
  const accuracySamples = useRef<{frequency: number, timestamp: number}[]>([])
  const currentNoteForAccuracy = useRef<string | null>(null)
  
  // Settings
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [bpm, setBpm] = useState<BPM>(60)

  // viewport / plotting
  const [viewportCenterFreq, setViewportCenterFreq] = useState<number>(440)
  const [targetCenterFreq, setTargetCenterFreq] = useState<number>(440)
  const VIEWPORT_SEMITONES = 24
  const TRANSITION_SPEED = 0.1
  const SLIDING_STEP_HZ = 80
  const STABILITY_FRAMES = 5
  const pitchStabilityBuffer = useRef<number[]>([])
  const [activeNoteIndex, setActiveNoteIndex] = useState<number>(-1)

  // pitch points
  const [pitchPoints, setPitchPoints] = useState<{ timestamp:number; frequency:number }[]>([])
  const prevPitch = useRef<number>(0)
  const lastValidPitch = useRef<number>(0)

  // target segments (square waveform)
  // each segment: { startMs, endMs, frequency, pitch, noteId }
  const [targetSegments, setTargetSegments] = useState<any[]>([])
  const cycleTemplateRef = useRef<{ segments: any[], cycleDuration:number } | null>(null)
  const appendControllerRef = useRef<{ nextStartMs:number | null, running:boolean }>({ nextStartMs: null, running: false })

  const startTimeRef = useRef<number>(Date.now())
  const animationFrameRef = useRef<number | null>(null)
  const [renderTrigger, setRenderTrigger] = useState(0)

  // layout
  const topBarHeight = 80
  const bottomBarHeight = 0
  const pianoWidth = 80
  const graphWidth = width - pianoWidth
  const graphHeight = height - topBarHeight - bottomBarHeight

  // convert pitch name -> frequency
  const pitchToFrequency = useCallback((p: string) => NOTE_FREQUENCIES_MAP[p] || 440, [])
  
  // Create falling sparkles when voice is in range
  // const createFallingSparkle = useCallback(() => {
  //   if (pitch <= 0) return // Only create sparkles when there's a valid pitch
  //
  //   const sparkleId = `falling_${Date.now()}_${Math.random()}`
  //   const centerX = graphWidth / 2 + pianoWidth // Account for piano width offset
  //   const pitchY = freqToY(pitch) // Get Y position of current pitch
  //
  //   // Start sparkles around the pitch position
  //   const startX = centerX
  //   const startY = pitchY + 25 // Start below the pitch position
  //
  //   const sparkleOpacity = new Animated.Value(1)
  //   const sparkleY = new Animated.Value(startY)
  //
  //   setFallingSparkles(prev => [...prev.slice(-30), { // Keep max 30 sparkles
  //     id: sparkleId,
  //     x: startX,
  //     y: startY,
  //     opacity: sparkleOpacity,
  //     animatedY: sparkleY,
  //     color: '#FFD700', // Gold color
  //     size: 12, // Fixed size for consistency
  //     createdAt: Date.now()
  //   }])
  //
  //   // Animate sparkle falling down from the pitch position
  //   Animated.parallel([
  //     Animated.timing(sparkleOpacity, {
  //       toValue: 0,
  //       duration: 1500, // 1.5 seconds to fall
  //       useNativeDriver: false
  //     }),
  //     Animated.timing(sparkleY, {
  //       toValue: graphHeight, // Fall to bottom of graph
  //       duration: 1500,
  //       useNativeDriver: false
  //     })
  //   ]).start(() => {
  //     // Remove sparkle after animation
  //     setFallingSparkles(prev => prev.filter(s => s.id !== sparkleId))
  //   })
  // }, [graphWidth, graphHeight, pianoWidth, pitch, freqToY])
  
  // FlappyBird-style accuracy calculation functions
  // Note: Using modular pitch accuracy utility instead of local calculation
  
  const calculateCycleAccuracy = useCallback((noteAccuraciesInCycle: number[]): number => {
    if (noteAccuraciesInCycle.length === 0) return 0
    /**
     * PITCH ACCURACY PER CYCLE FORMULA (from FlappyBird):
     * Accuracy for a cycle = (sum of all note accuracies in the cycle) / (number of notes in the cycle)
     * 
     * IMPORTANT: Only completed cycles are included. Incomplete cycles are excluded.
     */
    const sum = noteAccuraciesInCycle.reduce((acc, accuracy) => acc + accuracy, 0)
    return sum / noteAccuraciesInCycle.length
  }, [])
  
  const getOverallAccuracy = useCallback((): number | null => {
    return calculateOverallAccuracy(noteAccuracies)
  }, [noteAccuracies])

  // process notes payload
  const processNotesData = useCallback(() => {
    if (!gameNotes?.measures) return []
    const all: any[] = []
    const sortedMeasures = [...gameNotes.measures].sort((a: any, b: any) => a.measure_number - b.measure_number)
    sortedMeasures.forEach((measure: any) => {
      const sortedNotes = [...measure.notes].sort((a: any, b: any) => a.beat - b.beat)
      sortedNotes.forEach((n: any) => {
        all.push({
          id: `${measure.measure_number}_${n.beat}_${n.pitch}`,
          pitch: n.pitch,
          frequency: pitchToFrequency(n.pitch),
          duration: n.duration,
          beat: n.beat,
          measure: measure.measure_number
        })
      })
    })
    return all
  }, [gameNotes, pitchToFrequency])

  // freq -> Y
  const freqToY = useCallback((freq: number) => {
    if (freq <= 0) return graphHeight / 2
    const semitoneRatio = Math.pow(2, 1/12)
    const halfRange = VIEWPORT_SEMITONES / 2
    const minFreq = viewportCenterFreq / Math.pow(semitoneRatio, halfRange)
    const maxFreq = viewportCenterFreq * Math.pow(semitoneRatio, halfRange)
    const clamped = Math.max(minFreq, Math.min(maxFreq, freq))
    const logMin = Math.log2(minFreq)
    const logMax = Math.log2(maxFreq)
    const logFreq = Math.log2(clamped)
    const normalized = (logFreq - logMin) / (logMax - logMin)
    const y = graphHeight - (normalized * graphHeight)
    return Math.max(0, Math.min(graphHeight, y))
  }, [graphHeight, viewportCenterFreq])


  // calculate viewport center
  const calculateViewportCenter = useCallback(() => {
    const processed = processNotesData()
    if (!processed.length) return 440
    const freqs = [...new Set(processed.map((n:any) => n.frequency))].sort((a:number,b:number)=>a-b)
    if (freqs.length === 1) return freqs[0]
    const minFreq = freqs[0], maxFreq = freqs[freqs.length - 1]
    return Math.sqrt(minFreq * maxFreq)
  }, [processNotesData])

  // build cycle template (relative segments)
  const buildCycleTemplate = useCallback(() => {
    const processed = processNotesData()
    if (!processed.length) return { segments: [], cycleDuration: 0 }
    const segments: any[] = []
    let cursor = 0
    for (let i = 0; i < processed.length; i++) {
      const n = processed[i]
      const dur = Math.max(MIN_NOTE_MS, n.duration || 250)
      const startRel = cursor
      const endRel = cursor + dur
      segments.push({ startRel, endRel, frequency: n.frequency, pitch: n.pitch, noteId: `${n.id}_${i}`, duration: dur })
      cursor = endRel
    }
    return { segments, cycleDuration: cursor }
  }, [processNotesData])

  // append one cycle at absolute start (ensures no overlaps)
  const appendCycleAbsolute = useCallback((template: { segments: any[]; cycleDuration:number }, absoluteStartMs: number) => {
    if (!template || !template.segments?.length) return
    const newSegments = template.segments.map(s => ({
      startMs: absoluteStartMs + s.startRel,
      endMs: absoluteStartMs + s.endRel,
      frequency: s.frequency,
      pitch: s.pitch,
      noteId: `${s.noteId}_${absoluteStartMs}`,
      duration: s.duration
    }))
    setTargetSegments(prev => {
      const now = Date.now()
      const combined = [...prev, ...newSegments]
      // keep a sliding window, e.g. last 120s
      return combined.filter(seg => now - seg.startMs < 120_000)
    })
  }, [])

  // append loop: schedule sequential appends (precise, gapless)
  useEffect(() => {
    if (!isRecording) {
      // stop append loop
      appendControllerRef.current.running = false
      appendControllerRef.current.nextStartMs = null
      return
    }

    const template = buildCycleTemplate()
    cycleTemplateRef.current = template
    if (!template.segments.length || template.cycleDuration <= 0) return

    // initial contiguous cycles
    let nextStart = Date.now() + START_OFFSET_MS
    const initialCycles = 4
    for (let i = 0; i < initialCycles; i++) {
      appendCycleAbsolute(template, nextStart)
      nextStart += template.cycleDuration
    }

    appendControllerRef.current.running = true
    appendControllerRef.current.nextStartMs = nextStart

    // chaining function: schedule one append then schedule next at exact end
    const scheduleNext = () => {
      if (!appendControllerRef.current.running) return
      const startMs = appendControllerRef.current.nextStartMs ?? Date.now()
      appendCycleAbsolute(template, startMs)
      // schedule next at startMs + cycleDuration
      appendControllerRef.current.nextStartMs = startMs + template.cycleDuration
      const delay = Math.max(16, template.cycleDuration) // at least 16ms
      // use setTimeout for next cycle (keeps gapless alignment)
      setTimeout(() => {
        // loop
        scheduleNext()
      }, delay)
    }

    // start the chain (first append at 'nextStart' already done above, now schedule chain)
    setTimeout(() => {
      scheduleNext()
    }, Math.max(16, template.cycleDuration))

    return () => {
      appendControllerRef.current.running = false
      appendControllerRef.current.nextStartMs = null
    }
  }, [isRecording, buildCycleTemplate, appendCycleAbsolute])

  // harmonic bookkeeping + player
  const harmonicsSetRef = useRef<Set<string>>(new Set())
  const registerHarmonic = (k:string) => {
    if (harmonicsSetRef.current.has(k)) return false
    harmonicsSetRef.current.add(k)
    if (harmonicsSetRef.current.size > 500) {
      const arr = Array.from(harmonicsSetRef.current)
      for (let i = 0; i < 200 && i < arr.length; i++) harmonicsSetRef.current.delete(arr[i])
    }
    return true
  }

  const guitarHarmonicsRef = useRef<GuitarHarmonics | null>(null)
  useEffect(() => {
    try { guitarHarmonicsRef.current = new GuitarHarmonics() } catch (e) { guitarHarmonicsRef.current = null; console.warn('GuitarHarmonics init failed', e) }
    return () => { try { guitarHarmonicsRef.current?.stopAll?.() } catch {} }
  }, [])

  const playDataUriWithExpo = useCallback(async (dataUri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: dataUri }, { shouldPlay: true })
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status || status.isLoaded === false) return
        if (status.didJustFinish) {
          try { sound.unloadAsync() } catch {}
        }
      })
    } catch (e) { console.warn('expo-av playback error', e) }
  }, [])

  const playGuitarHarmonic = useCallback((pitchOrFreq: string | number, duration = 300) => {
    // HARMONICS COMPLETELY DISABLED FOR PERFORMANCE
    return

    /*
    let freq: number
    if (typeof pitchOrFreq === 'number') freq = pitchOrFreq
    else freq = NOTE_FREQUENCIES_MAP[pitchOrFreq] || parseFloat(pitchOrFreq) || 440

    try {
      if (guitarHarmonicsRef.current && typeof guitarHarmonicsRef.current.playNote === 'function') {
        let nearest = 'A4'; let md = Infinity
        for (const [n, f] of Object.entries(NOTE_FREQUENCIES_MAP)) {
          const d = Math.abs((f as number) - freq)
          if (d < md) { md = d; nearest = n }
        }
        try { guitarHarmonicsRef.current.playNote(nearest, duration); return } catch {}
      }
    } catch {}

    try {
      const dataUri = generateToneWavDataUri(freq, duration)
      playDataUriWithExpo(dataUri)
    } catch (e) { console.warn('Harmonic playback failed', e) }
    */
  }, [playDataUriWithExpo])

  // center-line checker for segments — play harmonic if center lies inside a segment (score now tracked separately)
  // COMPLETELY DISABLED FOR PERFORMANCE - HARMONIC SYSTEM CAUSING LAG
  /*
  useEffect(() => {
    if (!isRecording || isPaused || !targetSegments.length) return
    let rafId = 0

    const loop = () => {
      const now = Date.now()
      const centerX = graphWidth / 2
      for (let i = 0; i < targetSegments.length; i++) {
        const seg = targetSegments[i]
        const startX = graphWidth + ((seg.startMs - now) * PIXELS_PER_MS)
        const endX = graphWidth + ((seg.endMs - now) * PIXELS_PER_MS)
        const minX = Math.min(startX, endX)
        const maxX = Math.max(startX, endX)
        if (centerX >= minX - 0.5 && centerX <= maxX + 0.5) {
          const key = `${seg.noteId}_${Math.floor(seg.startMs / 50)}`
          if (registerHarmonic(key)) {
            playGuitarHarmonic(seg.frequency, Math.max(40, seg.endMs - seg.startMs))
          }
        }
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [isRecording, isPaused, targetSegments, graphWidth, playGuitarHarmonic])
  */

  // Simple microphone status logging
  useEffect(() => {
    if (isRecording) {
      console.log(`🎤 TuneTrackerGame: Microphone status - Access: ${micAccess}, Active: ${isActive}`);
    }
  }, [isRecording, micAccess, isActive])

  // viewport animation RAF
  const animate = useCallback(() => {
    if (isRecording && !isPaused && gameState === 'playing') {
      setViewportCenterFreq(current => {
        const diff = targetCenterFreq - current
        if (Math.abs(diff) < 0.1) return targetCenterFreq
        return current + diff * TRANSITION_SPEED
      })
      setRenderTrigger(r => r + 1)
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [isRecording, isPaused, targetCenterFreq, gameState])

  useEffect(() => {
    if (isRecording && !isPaused && gameState === 'playing') {
      startTimeRef.current = Date.now()
      animationFrameRef.current = requestAnimationFrame(animate)
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }
  }, [isRecording, isPaused, animate, gameState])


  // Process audio buffer with DSP module for pitch detection with noise reduction
  useEffect(() => {
    if (!audioBuffer || audioBuffer.length === 0 || !sampleRate || !isRecording || isPaused || !isActive || gameState !== 'playing') return;
    
    // Process each bufferId only once
    if (bufferId === idQ[idQ.length - 1]) return;
    
    // Calculate RMS
    DSPModule.rms(audioBuffer).then(currentRms => {
      // Add null check for Android compatibility
      const validRms = (currentRms !== null && currentRms !== undefined && !isNaN(currentRms)) ? currentRms : 0;
      addRMS(validRms);
      
      // Set parameters for pitch estimation with noise reduction
      let minFreq = MIN_FREQ;
      let maxFreq = MAX_FREQ;
      let threshold = THRESHOLD_DEFAULT;

      // Previous RMS and pitch values
      const rms_1 = rmsQ[rmsQ.length - 1];
      const rms_2 = rmsQ[rmsQ.length - 2];
      const pitch_1 = pitchQ[pitchQ.length - 1];
      const pitch_2 = pitchQ[pitchQ.length - 2];

      // Check conditions to restrict pitch search range (noise reduction)
      let restrictRange = ENABLE_FILTER;
      restrictRange &&= pitch_1 > 0; // Previous pitch detected
      restrictRange &&= rms_1 < rms_2 * RMS_GAP; // Decreasing RMS
      restrictRange &&= pitch_1 > 0 && pitch_2 > 0 && Math.abs(pitch_1 - pitch_2) / pitch_2 <= MAX_PITCH_DEV; // Stable pitch
      
      if (restrictRange) {
        minFreq = pitch_1 * (1 - MAX_PITCH_DEV);
        maxFreq = pitch_1 * (1 + MAX_PITCH_DEV);
        threshold = THRESHOLD_NOISY;
      }

      // Estimate pitch with adaptive parameters
      DSPModule.pitch(audioBuffer, sampleRate, minFreq, maxFreq, threshold).then(detectedPitch => {
        setPitch(detectedPitch);
        addPitch(detectedPitch);
        console.log(`Pitch: ${detectedPitch.toFixed(1)}Hz  [${minFreq.toFixed(1)}Hz-${maxFreq.toFixed(1)}Hz] threshold: ${threshold.toFixed(2)}`);
      }).catch(error => {
        console.error('DSP pitch detection error:', error);
        setPitch(-1);
        addPitch(-1);
      });
    }).catch(error => {
      console.error('DSP RMS calculation error:', error);
    });
  }, [audioBuffer, sampleRate, bufferId, isRecording, isPaused, isActive, idQ, pitchQ, rmsQ, addRMS, addPitch, gameState])

  // pitch plotting: ensure points are added as before (timestamp + frequency)
  // Color calculation is now inlined to prevent dependency issues

  useEffect(() => {
    if (!isRecording || isPaused || !isActive || gameState !== 'playing') return
    if (bufferId === idQ[idQ.length - 1]) return

    try {
      addId(bufferId)

      if (pitch > 0) {
      const bounds = checkViewportBounds(pitch)
      const stable = isPitchStable(pitch)
      if (stable && (bounds.isAbove || bounds.isBelow)) {
        if (bounds.isAbove) setTargetCenterFreq(prev => prev + SLIDING_STEP_HZ)
        else setTargetCenterFreq(prev => prev - SLIDING_STEP_HZ)
      }

      // find closest note index
      let closest = ""; let cIdx = -1; let md = Infinity
      for (const [n,f] of Object.entries(NOTE_FREQUENCIES_MAP)) {
        const d = Math.abs((f as number) - pitch)
        if (d < md) { md = d; closest = n; cIdx = PIANO_NOTES.indexOf(n) }
      }
      if (closest) setActiveNoteIndex(cIdx)

      lastValidPitch.current = pitch
      setPitchPoints(prev => {
        const now = Date.now()
        const newPoint = { timestamp: now, frequency: pitch }
        return [...prev, newPoint].filter(p => now - p.timestamp < POINT_LIFETIME_MS).slice(-MAX_PITCH_POINTS)
      })
      prevPitch.current = pitch
    } else if (lastValidPitch.current > 0) {
      const ts = Date.now()
      setPitchPoints(prev => {
        const last = prev[prev.length - 1]
        const shouldAdd = !last || ts - last.timestamp > 16
        if (shouldAdd) {
          const newPoint = { timestamp: ts, frequency: lastValidPitch.current }
          return [...prev, newPoint].filter(p => ts - p.timestamp < POINT_LIFETIME_MS).slice(-MAX_PITCH_POINTS)
        }
        return prev
      })
    }
    } catch (error) {
      console.error('Error in pitch plotting:', error)
      // Continue gracefully - don't break the plotting
    }
  }, [pitch, bufferId, isRecording, isPaused, isActive, addId, idQ, gameState]) 
  // Note: Intentionally not including checkViewportBounds, getCurrentTargetFrequency to prevent plotting breaks during color changes

  // FlappyBird-style accuracy tracking: collect samples while singing
  useEffect(() => {
    if (!isRecording || isPaused || gameState !== 'playing' || pitch <= 0) {
      return
    }

    const targetInfo = getCurrentTargetInfo()
    if (!targetInfo) {
      return
    }

    const noteId = targetInfo.noteId  // Use unique noteId for accuracy tracking
    const currentTime = Date.now()
    const diff = Math.abs(pitch - targetInfo.frequency)
    const accuracyTolerance = ACCURACY_TOLERANCE[difficulty]
    
    // Collect accuracy samples when user is within the accuracy tolerance range
    if (diff <= accuracyTolerance) {
      // Start tracking this note if it's new
      if (currentNoteForAccuracy.current !== noteId) {
        currentNoteForAccuracy.current = noteId
        accuracySamples.current = []
      }
      
      // Add sample to accuracy calculation
      accuracySamples.current.push({ frequency: pitch, timestamp: currentTime })
      
      // Keep only recent samples (last 2 seconds)
      const twoSecondsAgo = currentTime - 2000
      accuracySamples.current = accuracySamples.current.filter(sample => sample.timestamp > twoSecondsAgo)
    }
    
  }, [pitch, difficulty, isRecording, isPaused, gameState, getCurrentTargetInfo])

  // Note completion and cycle tracking (for green color indication)
  useEffect(() => {
    if (!isRecording || isPaused || gameState !== 'playing' || pitch <= 0) {
      // Reset tolerance tracking when not actively playing
      setCurrentNoteInTolerance(null)
      toleranceStartTime.current = null
      return
    }

    const targetInfo = getCurrentTargetInfo()
    if (!targetInfo) {
      setCurrentNoteInTolerance(null)
      toleranceStartTime.current = null
      return
    }

    const diff = Math.abs(pitch - targetInfo.frequency)
    const greenTolerance = DIFFICULTY_TOLERANCE[difficulty] // For green color indication
    const isInTolerance = diff <= greenTolerance
    const noteId = targetInfo.noteId  // Use unique noteId instead of just note name
    const currentTime = Date.now()

    if (isInTolerance) {
      // User is singing within green tolerance
      if (currentNoteInTolerance !== noteId) {
        // Started singing a new note in tolerance
        setCurrentNoteInTolerance(noteId)
        toleranceStartTime.current = currentTime
        
        // Start tolerance glow animation
        // Animated.loop(
        //   Animated.sequence([
        //     Animated.timing(toleranceGlowAnim, {
        //       toValue: 1,
        //       duration: 800,
        //       useNativeDriver: false
        //     }),
        //     Animated.timing(toleranceGlowAnim, {
        //       toValue: 0.3,
        //       duration: 800,
        //       useNativeDriver: false
        //     })
        //   ])
        // ).start()
      } 
      
      // Calculate progress for the current note being sung (based on how much width has been traversed)
      const currentSegment = targetSegments.find(seg => seg.noteId === noteId)
      if (currentSegment) {
        const now = Date.now()
        const centerX = graphWidth / 2
        const startX = graphWidth + ((currentSegment.startMs - now) * PIXELS_PER_MS)
        const endX = graphWidth + ((currentSegment.endMs - now) * PIXELS_PER_MS)
        const leftEdge = Math.min(startX, endX)
        const rightEdge = Math.max(startX, endX)
        const noteWidth = rightEdge - leftEdge
        
        let noteProgress = 0
        
        // Calculate progress based on how much of the note width has passed the center line
        if (centerX <= leftEdge) {
          // Center line hasn't reached the note yet
          noteProgress = 0
        } else if (centerX >= rightEdge) {
          // Center line has completely passed the note
          noteProgress = 100
        } else {
          // Center line is somewhere within the note
          const traversedWidth = centerX - leftEdge
          noteProgress = Math.min(100, Math.max(0, (traversedWidth / noteWidth) * 100))
        }
        
      }
      
      // Create falling sparkles when voice is in tolerance range
      // if (Math.abs(pitch - targetInfo.frequency) <= greenTolerance && Math.random() < 0.7) {
      //   // Create multiple sparkles for a more dramatic effect
      //   createFallingSparkle()
      //   if (Math.random() < 0.4) {
      //     setTimeout(() => createFallingSparkle(), 50) // Slight delay for second sparkle
      //   }
      //   if (Math.random() < 0.2) {
      //     setTimeout(() => createFallingSparkle(), 100) // Slight delay for third sparkle
      //   }
      // }
      
      if (currentNoteInTolerance === noteId) {
        // Continue singing the same note in tolerance
        const timeInTolerance = currentTime - (toleranceStartTime.current || currentTime)
        
        // Check if note has been completed (sung for required percentage of note duration)
        const requiredTime = getRequiredToleranceTime(noteId)
        if (timeInTolerance >= requiredTime && !completedNotes.has(noteId)) {
          // Mark note as completed
          setCompletedNotes(prev => new Set([...prev, noteId]))
          
          // Trigger completion animation
          // setRecentlyCompletedNote(noteId)
          // Animated.sequence([
          //   Animated.timing(noteCompletionAnim, {
          //     toValue: 1,
          //     duration: 300,
          //     useNativeDriver: false
          //   }),
          //   Animated.timing(noteCompletionAnim, {
          //     toValue: 0,
          //     duration: 200,
          //     useNativeDriver: false
          //   })
          // ]).start(() => {
          //   setRecentlyCompletedNote(null)
          // })
          
          // Note completed successfully
          
          // Calculate accuracy using FlappyBird method with collected samples
          let accuracy = 0
          if (accuracySamples.current.length > 0) {
            // Calculate average sung frequency from samples
            const avgSungFreq = accuracySamples.current.reduce((sum, sample) => sum + sample.frequency, 0) / accuracySamples.current.length
            accuracy = calculateNoteAccuracy({ targetFrequency: targetInfo.frequency, sungFrequency: avgSungFreq })
          } else {
            // Fallback: use current pitch for accuracy calculation
            accuracy = calculateNoteAccuracy({ targetFrequency: targetInfo.frequency, sungFrequency: pitch })
          }
          
          setNoteAccuracies(prev => [...prev, accuracy])
          
          // Update score (number of completed notes)
          setScore(prev => prev + 1)
          
          console.log(`✅ Note completed: ${noteId} (${diff.toFixed(1)}Hz off, ${accuracy.toFixed(1)}% accuracy, ${requiredTime}ms required, ${timeInTolerance}ms sung)`)
          
          // Clear samples for this note
          if (currentNoteForAccuracy.current === noteId) {
            accuracySamples.current = []
            currentNoteForAccuracy.current = null
          }
        }
      }
    } else {
      // User is not in green tolerance, reset tracking
      if (currentNoteInTolerance === noteId) {
        setCurrentNoteInTolerance(null)
        toleranceStartTime.current = null
        
        // Stop tolerance glow animation
        // toleranceGlowAnim.stopAnimation()
        // toleranceGlowAnim.setValue(0)
      }
    }
    
    // Check for completed cycles using FlappyBird logic
    const processedNotes = processNotesData()
    if (processedNotes.length > 0 && noteAccuracies.length >= processedNotes.length) {
      const completedCyclesCount = Math.floor(noteAccuracies.length / processedNotes.length)
      
      if (completedCyclesCount > completedCycles && completedCyclesCount > 0) {
        // New cycle completed
        setCompletedCycles(completedCyclesCount)
        
        // Calculate cycle accuracy from the most recent completed cycle's notes
        const cycleStartIndex = (completedCyclesCount - 1) * processedNotes.length
        const cycleEndIndex = completedCyclesCount * processedNotes.length
        const cycleNoteAccuracies = noteAccuracies.slice(cycleStartIndex, cycleEndIndex)
        
        console.log(`🎯 Checking cycle ${completedCyclesCount}: Start=${cycleStartIndex}, End=${cycleEndIndex}, Notes needed=${processedNotes.length}, Notes available=${cycleNoteAccuracies.length}`)
        
        if (cycleNoteAccuracies.length === processedNotes.length) {
          const cycleAccuracy = calculateCycleAccuracy(cycleNoteAccuracies)
          setCycleAccuracies(prev => [...prev, cycleAccuracy])
          
          console.log(`🎯 Cycle ${completedCyclesCount} completed! Accuracy: ${cycleAccuracy.toFixed(1)}%`)
          console.log(`🎯 Individual note accuracies for cycle: ${cycleNoteAccuracies.map(a => a.toFixed(1)).join(', ')}`)
        } else {
          console.log(`🎯 Not enough note accuracies for cycle ${completedCyclesCount}: needed ${processedNotes.length}, got ${cycleNoteAccuracies.length}`)
        }
      }
    }
    
  }, [pitch, difficulty, isRecording, isPaused, gameState, currentNoteInTolerance, completedNotes, completedCycles, noteAccuracies, score, getCurrentTargetInfo, processNotesData, calculateNoteAccuracy, calculateCycleAccuracy])

  // viewport helpers
  const checkViewportBounds = (p:number) => {
    const semitoneRatio = Math.pow(2, 1/12)
    const halfRange = VIEWPORT_SEMITONES / 2
    const minFreq = targetCenterFreq / Math.pow(semitoneRatio, halfRange)
    const maxFreq = targetCenterFreq * Math.pow(semitoneRatio, halfRange)
    return { isAbove: p > maxFreq, isBelow: p < minFreq, minFreq, maxFreq }
  }

  const isPitchStable = (newPitch:number) => {
    const buf = pitchStabilityBuffer.current
    buf.push(newPitch)
    if (buf.length > STABILITY_FRAMES) buf.shift()
    if (buf.length < STABILITY_FRAMES) return false
    const avg = buf.reduce((a,b)=>a+b,0)/buf.length
    const maxDev = Math.max(...buf.map(v => Math.abs(v - avg)))
    return maxDev < 10
  }

  // target info near center
  const getCurrentTargetInfo = useCallback(() => {
    if (!targetSegments.length) return null
    const now = Date.now()
    const centerX = graphWidth / 2
    const eps = 0.5
    for (let i = 0; i < targetSegments.length; i++) {
      const s = targetSegments[i]
      const startX = graphWidth + ((s.startMs - now) * PIXELS_PER_MS)
      const endX = graphWidth + ((s.endMs - now) * PIXELS_PER_MS)
      const minX = Math.min(startX, endX), maxX = Math.max(startX, endX)
      if (centerX >= minX - eps && centerX <= maxX + eps) {
        return { frequency: s.frequency, note: s.pitch, noteId: s.noteId, segment: s }
      }
    }
    return null
  }, [targetSegments, graphWidth])

  // renderGraph: draws square waveform segments and pitch line with proximity-based coloring
  const renderGraph = useMemo(() => {
    const pointsLength = pitchPoints.length
    const halfWidth = graphWidth / 2

    // draw pitch line regardless of isRecording (ensures visible)
    let pitchPath = null
    if (pointsLength > 0) {
      const now = Date.now()
      const visible: Array<{ x:number; y:number }> = []
      for (let i = 0; i < pointsLength; i++) {
        const p = pitchPoints[i]
        const timeDiff = now - p.timestamp
        const x = halfWidth - timeDiff * PIXELS_PER_MS
        if (x >= -200 && x <= graphWidth + 200) {
          const y = freqToY(p.frequency)
          visible.push({ x, y })
        }
      }
      if (visible.length >= 2) {
        pitchPath = Skia.Path.Make()
        pitchPath.moveTo(visible[0].x, visible[0].y)
        for (let i = 1; i < visible.length; i++) {
          pitchPath.lineTo(visible[i].x, visible[i].y)
        }
      }
    }

    // Determine pitch line color based on difficulty-specific tolerance
    const targetInfo = getCurrentTargetInfo()
    let pitchLineColor = '#FFFFFF' // default white (no voice or no target)
    let isInTolerance = false
    
    if (targetInfo && pitch > 0) {
      const diff = Math.abs(pitch - targetInfo.frequency)
      const tolerance = DIFFICULTY_TOLERANCE[difficulty]
      
      if (diff <= tolerance) {
        pitchLineColor = '#00FF00' // green: within difficulty tolerance
        isInTolerance = true
      } else if (diff <= tolerance * 2) {
        pitchLineColor = '#FFFF00' // yellow: within 2x tolerance
      } else {
        pitchLineColor = '#FF0000' // red: outside tolerance
      }
    }

    // compute visible target segments
    const waveformVisible = (() => {
      if (!targetSegments.length) return []
      const now = Date.now()
      return targetSegments
        .map(seg => {
          const startX = graphWidth + ((seg.startMs - now) * PIXELS_PER_MS)
          const endX = graphWidth + ((seg.endMs - now) * PIXELS_PER_MS)
          const y = freqToY(seg.frequency)
          return { ...seg, startX, endX, y }
        })
        .filter(s => s.endX >= -VISIBLE_MARGIN_PX && s.startX <= graphWidth + VISIBLE_MARGIN_PX)
        .sort((a,b) => a.startX - b.startX)
    })()

    return (
      <Canvas style={{ width: graphWidth, height: graphHeight }}>
        <Fill color="#1a1a1a" />

        {/* grid lines */}
        {(() => {
          const grid: Array<{ key:string; y:number }> = []
          const semitoneRatio = Math.pow(2, 1/12)
          const halfRange = VIEWPORT_SEMITONES / 2
          const minFreq = viewportCenterFreq / Math.pow(semitoneRatio, halfRange)
          const maxFreq = viewportCenterFreq * Math.pow(semitoneRatio, halfRange)
          for (const [note, freq] of Object.entries(NOTE_FREQUENCIES_MAP)) {
            if ((freq as number) >= minFreq && (freq as number) <= maxFreq) {
              if (note.includes('C') || note.includes('G')) grid.push({ key: note, y: freqToY(freq as number) })
            }
          }
          return grid.map(line => <Line key={line.key} p1={vec(0, line.y)} p2={vec(graphWidth, line.y)} color="#2a2a2a" strokeWidth={0.5} />)
        })()}

        {/* center vertical */}
        <Line p1={vec(halfWidth, 0)} p2={vec(halfWidth, graphHeight)} color="#ffffff" strokeWidth={2} />


        {/* pitch line with proximity-based coloring */}
        {pitchPath && <Path path={pitchPath} color={pitchLineColor} style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round" />}

        {/* square waveform: draw horizontal segments and vertical jumps */}
        {(() => {
          if (!waveformVisible.length) return null
          const path = Skia.Path.Make()
          const first = waveformVisible[0]
          path.moveTo(first.startX, first.y)
          path.lineTo(first.endX, first.y)
          for (let i = 1; i < waveformVisible.length; i++) {
            const prev = waveformVisible[i - 1]
            const cur = waveformVisible[i]

            // if there's a gap between prev.endX and cur.startX, draw horizontal line across gap at prev.y (visual continuity)
            if (Math.abs(prev.endX - cur.startX) > 0.5) {
              path.lineTo(cur.startX, prev.y)
            } else {
              // move to cur.startX at prev.y (ensures continuity)
              path.lineTo(cur.startX, prev.y)
            }

            // vertical jump to current note y (sharp edge)
            path.lineTo(cur.startX, cur.y)
            // horizontal segment for current note
            path.lineTo(cur.endX, cur.y)
          }
          return <Path path={path} color="#FFD700" style="stroke" strokeWidth={3} strokeCap="square" strokeJoin="miter" opacity={0.95} />
        })()}
      </Canvas>
    )
  }, [graphWidth, graphHeight, pitchPoints, targetSegments, viewportCenterFreq, renderTrigger, pitch, getCurrentTargetInfo, difficulty, completedNotes, freqToY])

  // piano keys - left side with inline target highlight (orange)
  const pianoKeys = useMemo(() => {
    const semitoneRatio = Math.pow(2, 1/12)
    const halfRange = VIEWPORT_SEMITONES / 2
    const minFreq = viewportCenterFreq / Math.pow(semitoneRatio, halfRange)
    const maxFreq = viewportCenterFreq * Math.pow(semitoneRatio, halfRange)

    const processed = processNotesData()
    const targetSet = new Set(processed.map((n:any) => n.pitch))

    const notesWithFreqs = PIANO_NOTES.map((note, idx) => {
      const nf = NOTE_FREQUENCIES_MAP[note]
      if (!nf || nf < minFreq || nf > maxFreq) return null
      return { note, index: idx, y: freqToY(nf), noteFreq: nf }
    }).filter((x): x is any => x !== null).sort((a,b) => b.y - a.y)

    return (
      <View style={[styles.pianoContainer, { position: 'relative' }]}>
        {notesWithFreqs.map(({ note, index, y }) => {
          const isActive = index === activeNoteIndex && isRecording && !isPaused
          const isSharp = note.includes('#')
          const isTarget = targetSet.has(note)
          const targetStyle = isTarget ? { backgroundColor: '#FF8C00', borderColor: '#FF6600', borderWidth: 2 } : {}
          return (
            <View key={note} style={[
              styles.pianoKey,
              { position: 'absolute', top: Math.max(4, Math.min(graphHeight - 24, y - 12)), height: 20, width: isSharp ? 60 : 72, left: isSharp ? 10 : 4, zIndex: isSharp ? 2 : 1, flex: 0 },
              isSharp ? styles.blackKey : styles.whiteKey,
              targetStyle,
              isActive && styles.activeKey
            ]}>
              <Text style={[
                styles.keyText,
                isTarget ? { color: '#FFFFFF', fontWeight: '700' } : (isSharp ? styles.blackKeyText : styles.whiteKeyText),
                isActive && styles.activeKeyText
              ]}>{note}</Text>
            </View>
          )
        })}
      </View>
    )
  }, [activeNoteIndex, isRecording, isPaused, freqToY, graphHeight, viewportCenterFreq, processNotesData])

  // Start game from menu with settings (or restart with current settings)
  const startGame = useCallback((selectedDifficulty?: Difficulty, selectedBpm?: BPM) => {
    if (selectedDifficulty) setDifficulty(selectedDifficulty)
    if (selectedBpm) setBpm(selectedBpm)
    
    // Initialize GameState for new game session
    initializeGameState()
    
    // Set start time when user actually starts playing
    if (gameStateRef.current) {
      gameStateRef.current.setStartTime(new Date().toISOString())
      console.log('🎮 TuneTracker: Game started at', gameStateRef.current.getStartTime())
    }
    
    setGameState('playing')
    setIsRecording(true)
    setIsPaused(false)
    setPitchPoints([])
    setScore(0)
    setCompletedCycles(0)
    setNoteAccuracies([])
    setCycleAccuracies([])
    setCompletedNotes(new Set())
    setCurrentNoteInTolerance(null)
    // setFallingSparkles([])
    toleranceStartTime.current = null
    accuracySamples.current = []
    currentNoteForAccuracy.current = null
    startTimeRef.current = Date.now()
    const opt = calculateViewportCenter()
    setViewportCenterFreq(opt)
    setTargetCenterFreq(opt)
    pitchStabilityBuffer.current = []
    harmonicsSetRef.current.clear()
  }, [calculateViewportCenter, initializeGameState])
  
  // End game
  const endGame = useCallback(() => {
    setGameState('gameOver')
    setIsRecording(false)
    setIsPaused(false)
    setTargetSegments([])
    appendControllerRef.current.running = false
    appendControllerRef.current.nextStartMs = null
    harmonicsSetRef.current.clear()
  }, [])
  
  // Reset to menu
  const resetGame = useCallback(async () => {
    // Set end time when user clicks menu button
    if (gameStateRef.current) {
      gameStateRef.current.setEndTime(new Date().toISOString())
      console.log('🎮 TuneTracker: Game ended (menu clicked) at', gameStateRef.current.getEndTime())
    }
    
    // Submit score before resetting
    await submitGameScore()
    
    setGameState('menu')
    setIsRecording(false)
    setIsPaused(false)
    setPitchPoints([])
    setActiveNoteIndex(-1)
    setTargetSegments([])
    setScore(0)
    setCompletedCycles(0)
    setNoteAccuracies([])
    setCycleAccuracies([])
    setCompletedNotes(new Set())
    setCurrentNoteInTolerance(null)
    // setFallingSparkles([])
    toleranceStartTime.current = null
    accuracySamples.current = []
    currentNoteForAccuracy.current = null
    appendControllerRef.current.running = false
    appendControllerRef.current.nextStartMs = null
    harmonicsSetRef.current.clear()
    const opt = calculateViewportCenter()
    setViewportCenterFreq(opt)
    setTargetCenterFreq(opt)
    pitchStabilityBuffer.current = []
    
    // Clear GameState
    gameStateRef.current = null
  }, [calculateViewportCenter, submitGameScore])
  
  // play/stop toggle during game
  const handlePlayStopToggle = useCallback(() => {
    if (gameState !== 'playing') return
    
    if (isRecording) {
      // Stop and go to game over
      endGame()
    } else {
      setIsRecording(true)
      setIsPaused(false)
      setPitchPoints([])
      startTimeRef.current = Date.now()
      const opt = calculateViewportCenter()
      setViewportCenterFreq(opt)
      setTargetCenterFreq(opt)
      pitchStabilityBuffer.current = []
      harmonicsSetRef.current.clear()
    }
  }, [gameState, isRecording, calculateViewportCenter, endGame])

  if (micAccess === "denied") return <RequireMicAccess />
  if (micAccess === "pending" || micAccess === "requesting") return null

  // Render menu using shared component
  if (gameState === 'menu') {
    return (
      <GameMenu
        gameName="Tune Tracker"
        onStartGame={startGame}
        micAccess={micAccess}
        isActive={isActive}
        showDifficulty={true}
        showBPM={true}
      />
    )
  }
  
  // Render game over screen using shared component
  if (gameState === 'gameOver') {
    const stats: GameStats = {
      score,
      noteAccuracies,
      cycleAccuracies,
      completedCycles
    }
    
    return (
      <GameOverScreen
        gameName="Tune Tracker"
        stats={stats}
        onPlayAgain={async () => {
          // Set end time when user clicks play again button
          if (gameStateRef.current) {
            gameStateRef.current.setEndTime(new Date().toISOString())
            console.log('🎮 TuneTracker: Game ended (play again clicked) at', gameStateRef.current.getEndTime())
          }
          
          // Submit score before starting new game
          await submitGameScore()
          // Start new game
          startGame(difficulty, bpm)
        }}
        onBackToMenu={resetGame}
        scoreLabel="Notes Completed"
      />
    )
  }

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => setGameState('menu')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Piano keys */}
        {pianoKeys}

        {/* Graph */}
        <View style={styles.graphContainer}>
          {renderGraph}

          {/* Game stats display */}
          {isRecording && !isPaused && (
            <>
              {/* Current pitch display */}
              {pitch > 0 && (
                <View style={styles.hzDisplayTopRight}>
                  <Text style={styles.hzTextTopRight}>{pitch.toFixed(1)} Hz</Text>
                </View>
              )}
              
              {/* Score and progress display */}
              <View style={styles.gameStatsDisplay}>
                <Text style={styles.gameStatsText}>
                  Notes: {score} | Cycles: {completedCycles}
                </Text>
                <Text style={styles.gameStatsSubtext}>
                  Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} (±{DIFFICULTY_TOLERANCE[difficulty]}Hz)
                </Text>
              </View>
            </>
          )}

          {/* Target note display with tolerance status */}
          {isRecording && !isPaused && (() => {
            const targetInfo = getCurrentTargetInfo()
            if (!targetInfo && pitch > 0) {
              let closestNote = ""
              let closestFreq = 0
              let minDiff = Infinity
              for (const [note, noteFreq] of Object.entries(NOTE_FREQUENCIES_MAP)) {
                const diff = Math.abs(pitch - (noteFreq as number))
                if (diff < minDiff) { minDiff = diff; closestNote = note; closestFreq = noteFreq as number }
              }
              if (closestNote) {
                return (
                  <View style={[styles.targetNoteDisplay, { backgroundColor: 'rgba(52,152,219,0.9)' }]}>
                    <Text style={styles.targetNoteText}>Closest: {closestNote}</Text>
                    <Text style={styles.targetFreqText}>{closestFreq.toFixed(1)} Hz</Text>
                  </View>
                )
              }
            }
            if (targetInfo) {
              // Simple target display
              const diff = pitch > 0 ? Math.abs(pitch - targetInfo.frequency) : Infinity
              const tolerance = DIFFICULTY_TOLERANCE[difficulty]
              const isInTolerance = diff <= tolerance
              
              return (
                <View style={[
                  styles.targetNoteDisplay, 
                  isInTolerance ? { backgroundColor: 'rgba(0,255,0,0.9)', borderColor: '#00FF00' } : {}
                ]}>
                  <Text style={[styles.targetNoteText, isInTolerance ? { color: '#000' } : {}]}>
                    Target: {targetInfo.note}
                  </Text>
                  <Text style={[styles.targetFreqText, isInTolerance ? { color: '#000' } : {}]}>
                    {targetInfo.frequency.toFixed(1)} Hz (±{tolerance}Hz)
                  </Text>
                  {pitch > 0 && (
                    <>
                      <View style={styles.frequencyDivider} />
                      <Text style={[styles.currentFreqLabel, isInTolerance ? { color: '#000' } : {}]}>
                        Current: {pitch.toFixed(1)} Hz ({diff.toFixed(1)}Hz off)
                      </Text>
                    </>
                  )}
                </View>
              )
            }
            return null
          })()}
          
        </View>
      </View>


      {/* Falling sparkles when voice is in range */}
      {/* {fallingSparkles.map(sparkle => (
        <Animated.View
          key={sparkle.id}
          style={{
            position: 'absolute',
            left: sparkle.x - sparkle.size / 2,
            top: sparkle.animatedY || sparkle.y, // Use animated Y position
            opacity: sparkle.opacity,
            zIndex: 20,
            pointerEvents: 'none'
          }}
        >
          <Text style={{
            color: sparkle.color,
            fontSize: sparkle.size,
            textShadowColor: sparkle.color + '80',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4
          }}>
            ✨
          </Text>
        </Animated.View>
      ))} */}

      {/* Play/Stop - only show during game */}
      {gameState === 'playing' && (
        <TouchableOpacity style={styles.mainControlButton} onPress={handlePlayStopToggle}>
          <Ionicons name={isRecording ? "stop" : "play"} size={32} color="#fff" />
        </TouchableOpacity>
      )}

    </View>
  )
}

// styles - matching FlappyBird design
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  topBar: { height: 40, backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, position: 'absolute', top: 60, left: 20, zIndex: 100 },
  screenTitle: { color: '#fff', fontSize: 20, fontWeight: '600' },
  mainContent: { flex: 1, flexDirection: 'row' },
  pianoContainer: { width: 80, backgroundColor: '#f8f9fa', borderRightWidth: 1, borderRightColor: '#e9ecef', position: 'relative', paddingVertical: 8, paddingHorizontal: 6 },
  pianoKey: { justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#dee2e6', borderRadius: 6, marginVertical: 0.5, marginHorizontal: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  whiteKey: { backgroundColor: '#ffffff', borderColor: '#dee2e6' },
  blackKey: { backgroundColor: '#495057', borderColor: '#6c757d' },
  activeKey: { backgroundColor: '#007bff', borderColor: '#0056b3', shadowColor: '#007bff', shadowOpacity: 0.3, shadowRadius: 6, transform: [{ scale: 1.05 }] },
  keyText: { fontSize: 8, fontWeight: '600', letterSpacing: 0.2 },
  whiteKeyText: { color: '#495057' },
  blackKeyText: { color: '#f8f9fa' },
  activeKeyText: { color: '#ffffff', fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  graphContainer: { flex: 1, position: 'relative' },
  mainControlButton: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  hzDisplayTopRight: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(44, 62, 80, 0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#34495e', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, zIndex: 10 },
  hzTextTopRight: { color: '#ecf0f1', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  gameStatsDisplay: { 
    position: 'absolute', 
    top: 16, 
    left: 16, 
    backgroundColor: 'rgba(16, 24, 40, 0.95)', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10
  },
  gameStatsText: { color: '#ecf0f1', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  gameStatsSubtext: { color: '#bdc3c7', fontSize: 10, fontWeight: '500', textAlign: 'center', marginTop: 2 },
  targetNoteDisplay: { position: 'absolute', top: 70, right: 16, backgroundColor: 'rgba(255, 215, 0, 0.9)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFD700', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, zIndex: 10, minWidth: 100 },
  targetNoteText: { color: '#1a1a1a', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  targetFreqText: { color: '#2c3e50', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  frequencyDivider: { height: 1, backgroundColor: 'rgba(26, 26, 26, 0.3)', marginVertical: 6, marginHorizontal: 4 },
  currentFreqLabel: { color: '#1a1a1a', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  currentFreqText: { color: '#2c3e50', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  
  // Tolerance progress indicator styles
  toleranceProgressContainer: { 
    marginTop: 8, 
    height: 20, 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    borderRadius: 10, 
    overflow: 'hidden',
    position: 'relative'
  },
  toleranceProgressBar: { 
    height: '100%', 
    backgroundColor: '#00FF00',
    borderRadius: 10
  },
  toleranceProgressText: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    textAlign: 'center', 
    lineHeight: 20, 
    fontSize: 10, 
    fontWeight: 'bold', 
    color: '#000'
  },
  
  // Enhanced Visual Feedback Styles
  enhancedTargetDisplay: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
    minHeight: 140
  },
  
  completionBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FFD700',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6
  },
  
  completionIcon: {
    fontSize: 18,
    color: '#FFF'
  },
  
  targetNoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  
  enhancedTargetNoteText: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  
  toleranceStateText: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6
  },
  
  enhancedTargetFreqText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.9
  },
  
  enhancedFrequencyDivider: {
    height: 2,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 8
  },
  
  enhancedCurrentFreqLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  
  frequencyDifferenceText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    opacity: 0.8
  },
  
  enhancedProgressContainer: {
    marginTop: 8,
    marginBottom: 8
  },
  
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6
  },
  
  enhancedProgressBar: {
    height: '100%',
    borderRadius: 4,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4
  },
  
  enhancedProgressText: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5
  },
  
  toleranceGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6
  },
  
  toleranceIndicator: {
    width: 20,
    height: 6,
    borderRadius: 3
  },
  
  perfectZone: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4
  },
  
  toleranceGuideText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8
  },
  
  // Particle Effects
  particleEffect: {
    position: 'absolute',
    zIndex: 1000
  },
  
  particleText: {
    fontSize: 24,
    color: '#FFD700',
    textShadowColor: 'rgba(255, 215, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  
  // Frequency Sparkles
  frequencySparkle: {
    position: 'absolute',
    zIndex: 999
  },
  
  sparkleText: {
    fontSize: 16,
    color: '#FFD700',
    textShadowColor: 'rgba(255, 215, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  
  enhancedSparkleText: {
    fontWeight: 'bold',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    shadowOpacity: 0.8
  },

  // Progress Sparkles
  progressSparkle: {
    position: 'absolute',
    zIndex: 998,
    alignItems: 'center',
    justifyContent: 'center'
  },

  progressSparkleText: {
    fontWeight: 'bold',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    shadowOpacity: 0.9
  },
  
  // Bottom Progress Bar
  bottomProgressContainer: {
    position: 'absolute',
    bottom: 20,
    left: '25%',
    right: '25%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6
  },
  
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4
  },
  
  progressText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3
  },
  
  noteProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  
  noteProgressTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.3
  },
  
  noteProgressStatus: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2
  }
})

export default TuneTrackerGame




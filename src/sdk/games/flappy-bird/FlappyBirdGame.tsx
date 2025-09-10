import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { View, useWindowDimensions, TouchableOpacity, Text, StyleSheet, Platform, Image as RNImage } from "react-native"
import { Canvas, Rect, Circle, Text as SkiaText, matchFont } from "@shopify/react-native-skia"
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useGameScreenMicrophone } from "@/hooks/useGameScreenMicrophone"
import { useGlobalPitchDetection } from "@/hooks/useGlobalPitchDetection"
import { NOTE_FREQUENCIES } from "@/utils/noteParser"
import { handleGameExit } from "../../../utils/gameNavigation"
import { GuitarHarmonics } from "@/utils/GuitarHarmonics"
import { Audio } from "expo-av"
import { encode as btoa } from "base-64"
import DSPModule from "@/../specs/NativeDSPModule"

// Create system font
const systemFont = matchFont({
  fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'Arial',
  fontSize: 14,
  fontStyle: 'normal',
  fontWeight: 'bold',
})

// TuneTracker pitch detection constants
const MIN_FREQ = 60
const MAX_FREQ = 6000
const MAX_PITCH_DEV = 0.2
const THRESHOLD_DEFAULT = 0.15
const THRESHOLD_NOISY = 0.6
const RMS_GAP = 1.1
const ENABLE_FILTER = true

// Game constants
const GRAVITY = 0.2
const BIRD_SIZE = 60
const PIPE_WIDTH_BASE = 60
const GAME_SPEED_BASE = 2
const NOTE_TEXT_OFFSET_X = -8 // Fixed X offset for note text
const NOTE_TEXT_OFFSET_Y = 4 // Fixed Y offset for note text
const HARMONIC_DISTANCE_THRESHOLD = 80 // Distance in pixels to trigger harmonics (increased for better detection)

// Difficulty settings
const DIFFICULTY_SETTINGS = {
  easy: { 
    frequencyTolerance: 50, // +/- 40Hz (larger gap for easy mode)
    circleRadius: 26, // Larger circle for easy mode
  },
  medium: { 
    frequencyTolerance: 30, // +/- 20Hz
    circleRadius: 18, // Medium circle for medium mode
  },
  hard: { 
    frequencyTolerance: 22, // +/- 12Hz
    circleRadius: 16, // Smaller circle for hard mode
  }
}

// BPM settings
const BPM_SETTINGS = {
  20: { speed: 0.33, notesPerSec: 1/3 },
  40: { speed: 0.67, notesPerSec: 2/3 },
  60: { speed: 1, notesPerSec: 1 },
  120: { speed: 2, notesPerSec: 2 }
}

// WAV tone generator for fallback audio
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

interface Note {
  frequency: number
  duration: number // in seconds
  name: string
}

interface Pipe {
  id: number
  x: number
  topHeight: number
  bottomY: number
  width: number
  note: Note
  passed: boolean
  circleRadius: number
}

interface Bird {
  x: number
  y: number
  velocity: number
}

type Difficulty = 'easy' | 'medium' | 'hard'
type BPM = 20 | 40 | 60 | 120

export interface FlappyBirdGameProps {
  notes?: {
    title: string
    measures: {
      notes: {
        beat: number
        pitch: string
        duration: number
      }[]
      measure_number: number
    }[]
    key_signature: string
    time_signature: string
  }
  onGameEnd?: (score: number) => void
}

export const FlappyBirdGame: React.FC<FlappyBirdGameProps> = ({ notes }) => {
  const { width, height } = useWindowDimensions()
  const navigation = useNavigation()
  
  
  // Use the game screen microphone hook for simplified microphone management
  const gameScreenMicrophone = useGameScreenMicrophone()
  const isActive = gameScreenMicrophone.isActive || false
  const micAccess = gameScreenMicrophone.micAccess || 'pending'
  
  // Enhanced pitch detection data from TuneTracker
  const {
    audioBuffer,
    sampleRate,
    bufferId,
  } = useGlobalPitchDetection()
  
  // Advanced pitch detection state
  const [pitch, setPitch] = useState<number>(0)
  const [pitchHistory, setPitchHistory] = useState<number[]>([])
  const [rmsHistory, setRmsHistory] = useState<number[]>([])
  const [bufferIdHistory, setBufferIdHistory] = useState<number[]>([])
  
  // Game state
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'dying' | 'gameOver'>('menu')
  const [bird, setBird] = useState<Bird>({ x: width * 0.2, y: height / 2, velocity: 0 })
  const [pipes, setPipes] = useState<Pipe[]>([])
  const [score, setScore] = useState(0)
  const [cycle, setCycle] = useState(0) // Track cycles in easy mode
  const [isInitializing, setIsInitializing] = useState(true)
  const [backgroundOffset, setBackgroundOffset] = useState(0) // For scrolling background
  
  // Pitch accuracy tracking
  const [noteAccuracies, setNoteAccuracies] = useState<number[]>([]) // Accuracy per note
  const [cycleAccuracies, setCycleAccuracies] = useState<number[]>([]) // Accuracy per cycle
  const [currentNoteAccuracy, setCurrentNoteAccuracy] = useState<number>(0) // Current note being tracked
  
  // Settings
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [bpm, setBpm] = useState<BPM>(60)
  
  // Game mechanics
  const gameLoopRef = useRef<number>()
  const lastNoteTime = useRef<number>(0)
  const pipeIdCounter = useRef(0)
  const gameStartTime = useRef<number>(0)
  const currentToleranceRef = useRef<number>(DIFFICULTY_SETTINGS.easy.frequencyTolerance) // Tolerance for current difficulty
  const deathAnimationTimer = useRef<NodeJS.Timeout | null>(null)
  
  // Accuracy tracking refs
  const currentPipeForAccuracy = useRef<Pipe | null>(null) // Current pipe being measured for accuracy
  const accuracySamples = useRef<{frequency: number, timestamp: number}[]>([]) // Pitch samples for current note
  
  // Process notes from payload or use default sequence
  const noteSequence: Note[] = useMemo(() => {
    if (notes && notes.measures.length > 0) {
      // Convert payload notes to game notes
      const gameNotes: Note[] = []
      notes.measures.forEach(measure => {
        measure.notes.forEach(note => {
          // Convert pitch string to frequency
          const frequency = NOTE_FREQUENCIES[note.pitch as keyof typeof NOTE_FREQUENCIES]
          if (frequency) {
            gameNotes.push({
              frequency,
              duration: note.duration,
              name: note.pitch
            })
          }
        })
      })
      return gameNotes.length > 0 ? gameNotes : getDefaultNotes()
    }
    return getDefaultNotes()
  }, [notes])

  function getDefaultNotes(): Note[] {
    return [
      { frequency: NOTE_FREQUENCIES['C3'], duration: 800, name: 'C3' },
      { frequency: NOTE_FREQUENCIES['D3'], duration: 600, name: 'D3' },
      { frequency: NOTE_FREQUENCIES['E3'], duration: 1000, name: 'E3' },
      { frequency: NOTE_FREQUENCIES['F3'], duration: 750, name: 'F3' },
      { frequency: NOTE_FREQUENCIES['G3'], duration: 900, name: 'G3' },
      { frequency: NOTE_FREQUENCIES['A3'], duration: 500, name: 'A3' },
      { frequency: NOTE_FREQUENCIES['B3'], duration: 1200, name: 'B3' },
      { frequency: NOTE_FREQUENCIES['C4'], duration: 1000, name: 'C4' },
      { frequency: NOTE_FREQUENCIES['B3'], duration: 700, name: 'B3' },
      { frequency: NOTE_FREQUENCIES['A3'], duration: 800, name: 'A3' },
      { frequency: NOTE_FREQUENCIES['G3'], duration: 600, name: 'G3' },
      { frequency: NOTE_FREQUENCIES['F3'], duration: 1100, name: 'F3' },
      { frequency: NOTE_FREQUENCIES['E3'], duration: 900, name: 'E3' },
      { frequency: NOTE_FREQUENCIES['D3'], duration: 750, name: 'D3' },
      { frequency: NOTE_FREQUENCIES['C3'], duration: 1000, name: 'C3' },
    ]
  }
  
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  
  // Initialize harmonics and handle loading state
  useEffect(() => {
    // Initialize GuitarHarmonics
    try {
      guitarHarmonicsRef.current = new GuitarHarmonics()
    } catch (error) {
      console.warn('GuitarHarmonics initialization failed:', error)
      guitarHarmonicsRef.current = null
    }
    
    // Set loading to false after a short delay to allow microphone to initialize
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 1000)
    
    return () => {
      clearTimeout(timer)
      
      // Cleanup harmonic checker interval
      if (harmonicCheckIntervalRef.current) {
        clearInterval(harmonicCheckIntervalRef.current)
        harmonicCheckIntervalRef.current = null
      }
      
      // Cleanup harmonics on unmount
      try {
        guitarHarmonicsRef.current?.stopAll?.()
      } catch (error) {
        console.warn('Error stopping harmonics:', error)
      }
    }
  }, [])
  
  // Set tolerance based on difficulty (constant for all cycles and notes)
  useEffect(() => {
    const newTolerance = DIFFICULTY_SETTINGS[difficulty].frequencyTolerance
    currentToleranceRef.current = newTolerance
  }, [difficulty])

  // Simple microphone status logging (no automatic restarts)
  useEffect(() => {
    if (gameState === 'playing') {
      console.log(`🎤 FlappyBirdGame: Microphone status - Access: ${micAccess}, Active: ${isActive}`);
    }
  }, [gameState, micAccess, isActive])
  
  // Audio playback functions
  const playDataUriWithExpo = useCallback(async (dataUri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: dataUri }, { shouldPlay: true })
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status || status.isLoaded === false) return
        if (status.didJustFinish) {
          try { sound.unloadAsync() } catch {}
        }
      })
    } catch (e) { 
      console.warn('expo-av playback error', e) 
    }
  }, [])

  const playGuitarHarmonic = useCallback(async (pitchOrFreq: string | number, duration = 300) => {
    let freq: number
    if (typeof pitchOrFreq === 'number') freq = pitchOrFreq
    else freq = NOTE_FREQUENCIES[pitchOrFreq as keyof typeof NOTE_FREQUENCIES] || parseFloat(pitchOrFreq) || 440

    try {
      if (guitarHarmonicsRef.current && typeof guitarHarmonicsRef.current.playNote === 'function') {
        let nearest = 'A4'; let md = Infinity
        for (const [n, f] of Object.entries(NOTE_FREQUENCIES)) {
          const d = Math.abs((f as number) - freq)
          if (d < md) { md = d; nearest = n }
        }
        try { 
          guitarHarmonicsRef.current.playNote(nearest, duration)
          return 
        } catch {}
      }
    } catch {}

    // Generate WAV asynchronously to avoid blocking main thread
    try {
      // Use setTimeout to make WAV generation non-blocking
      setTimeout(() => {
        try {
          const dataUri = generateToneWavDataUri(freq, duration)
          playDataUriWithExpo(dataUri)
        } catch (e) { 
          console.warn('WAV generation failed', e) 
        }
      }, 0)
    } catch (e) { 
      console.warn('Harmonic playback failed', e) 
    }
  }, [playDataUriWithExpo])
  
  // Convert frequency to Y position on screen (LINEAR mapping for consistent visual gaps)
  // 0Hz = bottom of screen, higher frequencies = higher on screen
  const frequencyToY = useCallback((freq: number) => {
    // Map frequency range (0Hz to 600Hz) to screen height - LINEAR scale
    const minFreq = 0
    const maxFreq = 600
    const clampedFreq = Math.max(minFreq, Math.min(maxFreq, freq))
    // LINEAR normalization - higher freq = lower Y (top of screen)
    const normalized = clampedFreq / maxFreq
    return height - (normalized * height)
  }, [height])
  
  // Pitch accuracy calculation functions
  const calculateNoteAccuracy = useCallback((sungFrequency: number, targetFrequency: number): number => {
    /**
     * PITCH ACCURACY PER NOTE FORMULA:
     * Accuracy for a note = max(0, (1 - (absolute value of (sung frequency - target frequency) / target frequency)) × 100)
     * 
     * Example: Sung 105Hz, Target 120Hz
     * Accuracy = max(0, (1 - |105 - 120| / 120) × 100) = max(0, (1 - 15/120) × 100) = 87.5%
     */
    const frequencyDifference = Math.abs(sungFrequency - targetFrequency)
    const relativeError = frequencyDifference / targetFrequency
    const accuracy = Math.max(0, (1 - relativeError) * 100)
    return accuracy
  }, [])
  
  const calculateCycleAccuracy = useCallback((noteAccuraciesInCycle: number[]): number => {
    if (noteAccuraciesInCycle.length === 0) return 0
    /**
     * PITCH ACCURACY PER CYCLE FORMULA:
     * Accuracy for a cycle = (sum of all note accuracies in the cycle) / (number of notes in the cycle)
     * 
     * Example: Note accuracies [87.5, 92.3, 88.1, 90.4, 91.7] in a 5-note cycle
     * Cycle Accuracy = (87.5 + 92.3 + 88.1 + 90.4 + 91.7) / 5 = 450.0 / 5 = 90.0%
     * 
     * IMPORTANT: Only completed cycles are included. Incomplete cycles are excluded.
     */
    const sum = noteAccuraciesInCycle.reduce((acc, accuracy) => acc + accuracy, 0)
    return sum / noteAccuraciesInCycle.length
  }, [])
  
  const getOverallAccuracy = useCallback((): { noteAccuracy: number | null, cycleAccuracy: number | null } => {
    /**
     * OVERALL ACCURACY CALCULATION LOGIC:
     * 
     * Priority 1: If user completed ≥1 cycle, show CYCLE ACCURACY
     * - Formula: (sum of all completed cycle accuracies) / (number of completed cycles)
     * - Excludes incomplete cycles
     * 
     * Priority 2: If user has notes but no completed cycles, show NOTE ACCURACY  
     * - Formula: (sum of note accuracies from completed cycles only) / (number of notes from completed cycles)
     * - Excludes notes from incomplete cycles
     * 
     * Priority 3: If no data, show null
     */
    
    // Priority 1: Use cycle accuracy if available (user completed at least one full cycle)
    if (cycleAccuracies.length > 0) {
      const overallCycleAccuracy = cycleAccuracies.reduce((acc, accuracy) => acc + accuracy, 0) / cycleAccuracies.length
      return { noteAccuracy: null, cycleAccuracy: overallCycleAccuracy }
    }
    
    // Priority 2: Use note accuracy from completed cycles only (exclude incomplete cycles)
    const completedCycles = Math.floor(noteAccuracies.length / noteSequence.length)
    if (completedCycles > 0) {
      // Only use notes from completed cycles, exclude any incomplete cycle notes
      const completedCycleNotes = noteAccuracies.slice(0, completedCycles * noteSequence.length)
      const overallNoteAccuracy = completedCycleNotes.reduce((acc, accuracy) => acc + accuracy, 0) / completedCycleNotes.length
      return { noteAccuracy: overallNoteAccuracy, cycleAccuracy: null }
    }
    
    // Priority 3: No completed cycles, no overall accuracy to show
    return { noteAccuracy: null, cycleAccuracy: null }
  }, [noteAccuracies, cycleAccuracies, noteSequence.length])
  
  // Create a new pipe based on current note
  const createPipe = useCallback(() => {
    const isFirstPipeOfNewCycle = currentNoteIndex > 0 && (currentNoteIndex % noteSequence.length) === 0
    const note = noteSequence[currentNoteIndex % noteSequence.length]
    // Calculate gap based on note frequency and current difficulty tolerance
    const noteFrequency = note.frequency
    
    // Use the tolerance for this difficulty
    const tolerance = currentToleranceRef.current
    
    // Calculate frequency range for the gap (note frequency ± tolerance)
    const minGapFreq = Math.max(0, noteFrequency - tolerance) // Lower threshold (bottom of gap)
    const maxGapFreq = noteFrequency + tolerance // Upper threshold (top of gap)
    
    // Convert frequency range to Y positions
    const topOfGap = frequencyToY(maxGapFreq) // Higher frequency = higher on screen = lower Y
    const bottomOfGap = frequencyToY(minGapFreq) // Lower frequency = lower on screen = higher Y
    
    // Calculate BPM-adjusted base width
    const bpmSettings = BPM_SETTINGS[bpm]
    const bpmAdjustedBase = PIPE_WIDTH_BASE / bpmSettings.speed
    
    // Calculate pipe width based on duration
    const durationInSeconds = note.duration / 1000
    const pipeWidth = bpmAdjustedBase * durationInSeconds
    
    // Ensure proper gap size and positioning
    const minGapSize = 80 // Minimum gap size for visibility
    const gapSize = Math.abs(bottomOfGap - topOfGap)
    
    let topPipeHeight: number // Top pipe goes from 0 to topOfGap
    let bottomPipeStartY: number // Bottom pipe goes from bottomOfGap to height
    
    // If gap is too small, expand it
    if (gapSize < minGapSize) {
      const expansion = (minGapSize - gapSize) / 2
      const adjustedTopOfGap = Math.max(30, topOfGap - expansion)
      const adjustedBottomOfGap = Math.min(height - 30, bottomOfGap + expansion)
      
      topPipeHeight = adjustedTopOfGap
      bottomPipeStartY = adjustedBottomOfGap
    } else {
      // Use original positioning if gap is adequate
      topPipeHeight = Math.max(30, topOfGap)
      bottomPipeStartY = Math.min(height - 30, bottomOfGap)
    }
    
    const pipe: Pipe = {
      id: pipeIdCounter.current++,
      x: width,
      topHeight: topPipeHeight, // Top pipe from 0 to topOfGap
      bottomY: bottomPipeStartY, // Bottom pipe from bottomOfGap to height
      width: pipeWidth,
      note: note,
      passed: false,
      circleRadius: DIFFICULTY_SETTINGS[difficulty].circleRadius
    }
    
    setCurrentNoteIndex(prev => prev + 1)
    return pipe
  }, [currentNoteIndex, noteSequence, frequencyToY, width, height, bpm, difficulty])
  
  // Track pitch detection for continuous flying
  const isPitchDetectedRef = useRef<boolean>(false)
  const lastPitchTimeRef = useRef<number>(0)
  
  // Harmonic playback
  const guitarHarmonicsRef = useRef<GuitarHarmonics | null>(null)
  const harmonicsPlayedRef = useRef<Set<string>>(new Set())
  const lastHarmonicTimeRef = useRef<{ [key: string]: number }>({})  
  
  // Advanced pitch detection with TuneTracker's DSP module (replaces simple pitch detection)
  useEffect(() => {
    if (!audioBuffer || audioBuffer.length === 0 || !sampleRate || gameState !== 'playing' || !isActive) return;
    
    // Process each bufferId only once
    if (bufferId === bufferIdHistory[bufferIdHistory.length - 1]) return;
    
    // Calculate RMS
    DSPModule.rms(audioBuffer).then(currentRms => {
      // Add null check for Android compatibility
      const validRms = (currentRms !== null && currentRms !== undefined && !isNaN(currentRms)) ? currentRms : 0;
      // Add to RMS history
      setRmsHistory(prev => [...prev.slice(-9), validRms]); // Keep last 10 values
      
      // Set parameters for pitch estimation with noise reduction
      let minFreq = MIN_FREQ;
      let maxFreq = MAX_FREQ;
      let threshold = THRESHOLD_DEFAULT;

      // Previous RMS and pitch values
      const rms_1 = rmsHistory[rmsHistory.length - 1];
      const rms_2 = rmsHistory[rmsHistory.length - 2];
      const pitch_1 = pitchHistory[pitchHistory.length - 1];
      const pitch_2 = pitchHistory[pitchHistory.length - 2];

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
        setPitchHistory(prev => [...prev.slice(-9), detectedPitch]); // Keep last 10 values
        setBufferIdHistory(prev => [...prev.slice(-9), bufferId]); // Keep last 10 values
        
        console.log(`FlappyBird Pitch: ${detectedPitch.toFixed(1)}Hz  [${minFreq.toFixed(1)}Hz-${maxFreq.toFixed(1)}Hz] threshold: ${threshold.toFixed(2)}`);
        
        // Update bird flying state
        const currentTime = Date.now();
        if (detectedPitch > 0) {
          isPitchDetectedRef.current = true;
          lastPitchTimeRef.current = currentTime;
        } else {
          // If no pitch for more than 200ms, stop flying
          if (currentTime - lastPitchTimeRef.current > 200) {
            isPitchDetectedRef.current = false;
          }
        }
      }).catch(error => {
        console.error('FlappyBird DSP pitch detection error:', error);
        setPitch(-1);
        setPitchHistory(prev => [...prev.slice(-9), -1]);
        setBufferIdHistory(prev => [...prev.slice(-9), bufferId]);
      });
    }).catch(error => {
      console.error('FlappyBird DSP RMS calculation error:', error);
    });
  }, [audioBuffer, sampleRate, bufferId, gameState, isActive, pitchHistory, rmsHistory, bufferIdHistory]);

  // Handle game end callback - start death animation
  const handleGameEnd = useCallback(() => {
    setGameState('dying')
    // Start death animation timer - bird will fall for 2 seconds then show game over
    deathAnimationTimer.current = setTimeout(() => {
      setGameState('gameOver')
    }, 2000)
  }, [])
  
  // Final game over (after death animation)
  const handleFinalGameOver = useCallback(() => {
    if (deathAnimationTimer.current) {
      clearTimeout(deathAnimationTimer.current)
      deathAnimationTimer.current = null
    }
    setGameState('gameOver')
  }, [])
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'dying') return
    
    const gameLoop = () => {
      const now = Date.now()
      const bpmSettings = BPM_SETTINGS[bpm]
      const timePerNote = 1000 / bpmSettings.notesPerSec // milliseconds per note
      
      
      // Update bird physics
      setBird(prev => {
        let newY = prev.y
        let newVelocity = 0
        
        if (gameState === 'dying') {
          // During death animation, just apply gravity (bird falls down) - scaled with BPM
          const bpmScaledGravity = GRAVITY * 1.5 * bpmSettings.speed // Faster falling during death
          newVelocity = prev.velocity + bpmScaledGravity
          newY = prev.y + newVelocity
          
          // Stop falling when hitting the ground
          if (newY > height - BIRD_SIZE) {
            newY = height - BIRD_SIZE
            newVelocity = 0
            // Trigger final game over when bird hits ground
            handleFinalGameOver()
          }
          
          return {
            ...prev,
            y: newY,
            velocity: newVelocity
          }
        }
        
        // Normal playing physics
        // Give player 3 seconds grace period at start before gravity applies
        const gracePeriod = 3000 // 3 seconds
        const timeSinceStart = now - gameStartTime.current
        const isInGracePeriod = timeSinceStart < gracePeriod
        
        // If pitch is detected, map frequency to Y position using same function as pipes
        if (isPitchDetectedRef.current && pitch > 0) {
          // Use the same frequency-to-Y mapping as pipes for perfect alignment
          const targetY = frequencyToY(pitch)
          
          // Use faster, more responsive transition that scales with BPM
          const baseTransitionSpeed = 0.25
          const bpmSpeedMultiplier = bpmSettings.speed
          const transitionSpeed = baseTransitionSpeed * bpmSpeedMultiplier
          newY = prev.y + (targetY - prev.y) * transitionSpeed
          newVelocity = (newY - prev.y) // Calculate velocity based on Y change
        } else if (!isInGracePeriod) {
          // No pitch detected and grace period over, apply gravity (scaled with BPM)
          const bpmScaledGravity = GRAVITY * bpmSettings.speed
          newVelocity = prev.velocity + bpmScaledGravity
          newY = prev.y + newVelocity
        } else {
          // In grace period, bird stays in place
          newY = prev.y
          newVelocity = 0
        }
        
        // Check boundaries (only during playing, not dying)
        if (newY < 0 || newY > height - BIRD_SIZE) {
          handleGameEnd()
          return prev
        }
        
        return {
          ...prev,
          y: newY,
          velocity: newVelocity
        }
      })
      
      // Update pipes (movement, generation, and cleanup) - only during playing
      if (gameState === 'playing') {
        setPipes(prev => {
          const gameSpeed = GAME_SPEED_BASE * bpmSettings.speed
          // Scale spacing with BPM so spacing feels consistent across all speeds
          const basePipeSpacing = 180 // Base spacing at BPM 60
          const baseCycleSpacing = 300 // Base cycle spacing at BPM 60
          const minPipeSpacing = basePipeSpacing / bpmSettings.speed // Inversely scale with speed
          const cycleSpacing = baseCycleSpacing / bpmSettings.speed // Inversely scale with speed
          
          // First, update existing pipe positions
          let updatedPipes = prev
            .map(pipe => ({
              ...pipe,
              x: pipe.x - gameSpeed
            }))
            .filter(pipe => pipe.x + pipe.width > -100) // Remove off-screen pipes
          
          // Then check if we need a new pipe
          const shouldCreatePipe = now - lastNoteTime.current >= timePerNote
          const lastPipe = updatedPipes[updatedPipes.length - 1]
          
          // Check if next pipe will be first of a new cycle
          const isNextPipeFirstOfNewCycle = currentNoteIndex > 0 && (currentNoteIndex % noteSequence.length) === 0
          const requiredSpacing = isNextPipeFirstOfNewCycle ? cycleSpacing : minPipeSpacing
          const hasEnoughSpacing = !lastPipe || (width - lastPipe.x) >= requiredSpacing
          
          if (shouldCreatePipe && hasEnoughSpacing) {
            const newPipe = createPipe()
            lastNoteTime.current = now
            updatedPipes = [...updatedPipes, newPipe]
          }
          
          return updatedPipes
        })
      }
      
      // Check collisions and scoring - only during playing
      if (gameState === 'playing') {
        setPipes(prev => {
        let newScore = score
        let cycleComplete = false
        
        const updatedPipes = prev.map(pipe => {
          // Track accuracy while bird is in pipe area
          if (bird.x + BIRD_SIZE > pipe.x && bird.x < pipe.x + pipe.width && pitch > 0) {
            // Bird is in pipe area and singing - collect accuracy sample
            if (currentPipeForAccuracy.current?.id !== pipe.id) {
              // Starting to track a new pipe
              currentPipeForAccuracy.current = pipe
              accuracySamples.current = []
            }
            
            // Add current pitch sample
            accuracySamples.current.push({
              frequency: pitch,
              timestamp: now
            })
          }
          
          // Check if bird passed pipe
          if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            pipe.passed = true
            newScore++
            
            // Calculate accuracy for this note if we have samples
            if (currentPipeForAccuracy.current?.id === pipe.id && accuracySamples.current.length > 0) {
              // Calculate average sung frequency for this note
              const avgSungFreq = accuracySamples.current.reduce((sum, sample) => sum + sample.frequency, 0) / accuracySamples.current.length
              const noteAccuracy = calculateNoteAccuracy(avgSungFreq, pipe.note.frequency)
              
              // Add to note accuracies
              setNoteAccuracies(prev => [...prev, noteAccuracy])
              
              // Clear samples for next note
              accuracySamples.current = []
              currentPipeForAccuracy.current = null
            }
            
            // Check if we completed a full cycle (for cycle tracking)
            if (newScore % noteSequence.length === 0 && newScore > 0) {
              cycleComplete = true
              
              // Calculate overall accuracy for this cycle
              const startIndex = Math.max(0, noteAccuracies.length - noteSequence.length + 1)
              const cycleNoteAccuracies = noteAccuracies.slice(startIndex)
              if (cycleNoteAccuracies.length > 0) {
                const overallCycleAccuracy = cycleNoteAccuracies.reduce((sum, acc) => sum + acc, 0) / cycleNoteAccuracies.length
                setCycleAccuracies(prev => [...prev, overallCycleAccuracy])
                
                // Log cycle completion
                const cycleNumber = Math.floor(newScore / noteSequence.length)
                console.log(`🎯 Cycle ${cycleNumber} completed! Overall accuracy: ${overallCycleAccuracy.toFixed(1)}%`)
              }
            }
          }
          
          // Check collision - bird hits the actual pipe, not when in the gap
          if (
            bird.x + BIRD_SIZE > pipe.x &&
            bird.x < pipe.x + pipe.width
          ) {
            // Bird is horizontally within the pipe area
            // Check if bird hits the top pipe OR hits the bottom pipe
            const birdHitsTopPipe = bird.y < pipe.topHeight
            const birdHitsBottomPipe = bird.y + BIRD_SIZE > pipe.bottomY
            
            if (birdHitsTopPipe || birdHitsBottomPipe) {
              // Check if bird is singing the correct pitch within threshold
              const tolerance = currentToleranceRef.current
              const targetFreq = pipe.note.frequency
              const isWithinThreshold = pitch > 0 && 
                Math.abs(pitch - targetFreq) <= tolerance
              
              // Only trigger game over if NOT singing the correct pitch
              if (!isWithinThreshold) {
                handleGameEnd()
              }
              // If within threshold, allow bird to pass through the pipe!
            }
          }
          
          return pipe
        })
        
        if (newScore !== score) {
          setScore(newScore)
        }
        
        if (cycleComplete) {
          setCycle(prev => {
            const newCycleCount = prev + 1
            
            // Calculate cycle accuracy from the last noteSequence.length notes
            const lastNoteAccuracies = noteAccuracies.slice(-noteSequence.length)
            if (lastNoteAccuracies.length === noteSequence.length) {
              const cycleAccuracy = calculateCycleAccuracy(lastNoteAccuracies)
              setCycleAccuracies(prevCycles => [...prevCycles, cycleAccuracy])
            }
            
            return newCycleCount
          })
        }
        
        return updatedPipes
        })
      }
      
      // Update background scrolling
      if (gameState === 'playing') {
        const backgroundSpeed = GAME_SPEED_BASE * bpmSettings.speed * 0.3 // Slower than pipes
        setBackgroundOffset(prev => (prev + backgroundSpeed) % width)
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop)
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, bird, score, createPipe, bpm, height, difficulty, noteSequence.length, frequencyToY, handleGameEnd, pitch, width, handleFinalGameOver])
  
  // Harmonic proximity checker (optimized to avoid blocking main thread)
  const harmonicCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    console.log('🎵 Harmonic checker effect triggered, gameState:', gameState)
    
    if (gameState !== 'playing') {
      if (harmonicCheckIntervalRef.current) {
        clearInterval(harmonicCheckIntervalRef.current)
        harmonicCheckIntervalRef.current = null
      }
      return
    }
    
    const checkHarmonics = () => {
      if (gameState !== 'playing' || pipes.length === 0) {
        console.log('🎵 Skipping harmonic check - gameState:', gameState, 'pipes:', pipes.length)
        return
      }
      
      try {
        const now = Date.now()
        const birdCenterX = bird.x + BIRD_SIZE / 2
        const birdCenterY = bird.y + BIRD_SIZE / 2
        
        console.log(`🎵 Checking harmonics - Bird position: (${birdCenterX.toFixed(1)}, ${birdCenterY.toFixed(1)}), Pipes: ${pipes.length}`)
        
        pipes.forEach(pipe => {
          const pipeId = `pipe_${pipe.id}`
          const pipeLeftEdge = pipe.x
          const pipeRightEdge = pipe.x + pipe.width
          
          // Calculate distance from bird to pipe edges
          const distanceToLeftEdge = birdCenterX - pipeLeftEdge
          const distanceToRightEdge = pipeRightEdge - birdCenterX
          
          // Bird is in the trigger zone if:
          // 1. Bird is 100px before the pipe (approaching)
          // 2. Bird is within the pipe width
          // 3. Bird is 100px after the pipe (leaving)
          const isInTriggerZone = (
            distanceToLeftEdge >= -HARMONIC_DISTANCE_THRESHOLD && // 100px before pipe
            distanceToRightEdge >= -HARMONIC_DISTANCE_THRESHOLD    // 100px after pipe
          )
          
          console.log(`🎵 Pipe ${pipe.id} (${pipe.note.name}): Bird=${birdCenterX.toFixed(1)}, Pipe=[${pipeLeftEdge.toFixed(1)}-${pipeRightEdge.toFixed(1)}], InZone=${isInTriggerZone}`)
          
          // Check if bird is in the harmonic trigger zone (play regardless of user singing)
          if (isInTriggerZone) {
            // BUT stop playing if user stops singing
            if (!isPitchDetectedRef.current || pitch <= 0) {
              // User stopped singing - stop harmonics immediately
              if (lastHarmonicTimeRef.current[pipeId]) {
                console.log(`🎵 STOPPING harmonics for pipe ${pipe.id} - user stopped singing`)
                delete lastHarmonicTimeRef.current[pipeId]
              }
              return // Don't play harmonics
            }
            // Play harmonic continuously while in zone and user is singing (throttle to once per 150ms for smooth continuous play)
            const lastPlayTime = lastHarmonicTimeRef.current[pipeId] || 0
            const timeSinceLastPlay = now - lastPlayTime
            
            console.log(`🎵 In trigger zone with pitch detected! Pitch: ${pitch.toFixed(1)}Hz, Time since last play: ${timeSinceLastPlay}ms`)
            
            if (timeSinceLastPlay > 150) { // Reduced throttle for continuous play
              console.log(`🎵🎸 PLAYING HARMONIC for pipe ${pipe.id}: ${pipe.note.name} (${pipe.note.frequency}Hz) - in trigger zone with pitch`)
              
              // Play harmonic with longer duration for continuous effect
              try {
                playGuitarHarmonic(pipe.note.frequency, 300) // Longer duration for overlap
                console.log(`🎵✅ Harmonic played successfully for ${pipe.note.name}`)
              } catch (error) {
                console.error('🎵❌ Error playing harmonic:', error)
              }
              
              lastHarmonicTimeRef.current[pipeId] = now
            }
          } else {
            // Bird left the zone, reset timing for this pipe
            if (lastHarmonicTimeRef.current[pipeId]) {
              console.log(`🎵 Stopping harmonics for pipe ${pipe.id} - bird left zone`)
              delete lastHarmonicTimeRef.current[pipeId]
            }
          }
        })
      } catch (error) {
        console.error('🎵❌ Error in harmonic check:', error)
      }
    }
    
    // Start checking harmonics immediately
    checkHarmonics()
    
    // Set up interval to check every 50ms for more responsive harmonic triggering
    harmonicCheckIntervalRef.current = setInterval(checkHarmonics, 50)
    
    return () => {
      if (harmonicCheckIntervalRef.current) {
        clearInterval(harmonicCheckIntervalRef.current)
        harmonicCheckIntervalRef.current = null
      }
    }
  }, [gameState, bird, pipes, playGuitarHarmonic]) // Include dependencies to ensure we have latest values
  
  // Start game
  const startGame = useCallback(() => {
    // Clean up any existing harmonic checker interval
    if (harmonicCheckIntervalRef.current) {
      clearInterval(harmonicCheckIntervalRef.current)
      harmonicCheckIntervalRef.current = null
    }
    
    // Clean up any existing death animation timer
    if (deathAnimationTimer.current) {
      clearTimeout(deathAnimationTimer.current)
      deathAnimationTimer.current = null
    }
    
    setBird({ x: width * 0.2, y: height / 2, velocity: 0 })
    setPipes([])
    setScore(0)
    setCycle(0)
    setCurrentNoteIndex(0)
    setBackgroundOffset(0)
    // Reset accuracy tracking
    setNoteAccuracies([])
    setCycleAccuracies([])
    setCurrentNoteAccuracy(0)
    currentPipeForAccuracy.current = null
    accuracySamples.current = []
    // Reset tolerance based on difficulty
    currentToleranceRef.current = DIFFICULTY_SETTINGS[difficulty].frequencyTolerance
    // Reset harmonic tracking
    harmonicsPlayedRef.current.clear()
    lastHarmonicTimeRef.current = {}
    // Reset pitch detection history
    setPitch(0)
    setPitchHistory([])
    setRmsHistory([])
    setBufferIdHistory([])
    setGameState('playing')
    const now = Date.now()
    lastNoteTime.current = now
    gameStartTime.current = now // Track when game started
  }, [width, height, difficulty])
  
  // Reset game
  const resetGame = useCallback(() => {
    // Clean up any existing harmonic checker interval
    if (harmonicCheckIntervalRef.current) {
      clearInterval(harmonicCheckIntervalRef.current)
      harmonicCheckIntervalRef.current = null
    }
    
    // Clean up any existing death animation timer
    if (deathAnimationTimer.current) {
      clearTimeout(deathAnimationTimer.current)
      deathAnimationTimer.current = null
    }
    
    setGameState('menu')
    setBird({ x: width * 0.2, y: height / 2, velocity: 0 })
    setPipes([])
    setScore(0)
    setCycle(0)
    setCurrentNoteIndex(0)
    setBackgroundOffset(0)
    // Reset accuracy tracking
    setNoteAccuracies([])
    setCycleAccuracies([])
    setCurrentNoteAccuracy(0)
    currentPipeForAccuracy.current = null
    accuracySamples.current = []
    // Reset tolerance based on difficulty
    currentToleranceRef.current = DIFFICULTY_SETTINGS[difficulty].frequencyTolerance
    // Reset harmonic tracking
    harmonicsPlayedRef.current.clear()
    lastHarmonicTimeRef.current = {}
    // Reset pitch detection history
    setPitch(0)
    setPitchHistory([])
    setRmsHistory([])
    setBufferIdHistory([])
  }, [width, height, difficulty])
  
  // Render game canvas
  const renderGame = useMemo(() => {
    if (gameState === 'menu' || gameState === 'gameOver') return null
    
    return (
      <Canvas style={{ width, height, position: 'absolute', top: 0, left: 0, zIndex: 4 }}>
        {/* Transparent background so the scrolling background shows through */}
        
        {/* Note labels in the gap - rendered on Canvas */}
        {pipes.map(pipe => (
          <React.Fragment key={pipe.id}>
            {/* Note label background in the gap */}
            <Circle
              cx={pipe.x + pipe.width / 2}
              cy={(pipe.topHeight + pipe.bottomY) / 2}
              r={pipe.circleRadius}
              color="rgba(0, 0, 0, 0.9)"
            />
            {/* Note label text in the gap */}
            <SkiaText
              x={pipe.x + pipe.width / 2 + NOTE_TEXT_OFFSET_X}
              y={(pipe.topHeight + pipe.bottomY) / 2 + NOTE_TEXT_OFFSET_Y}
              text={pipe.note.name}
              color="#FFFFFF"
              font={systemFont}
            />
          </React.Fragment>
        ))}
      </Canvas>
    )
  }, [gameState, width, height, pipes, bird])
  
  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <View style={styles.container}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => handleGameExit(navigation as any)}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.menuContainer}>
          <Text style={styles.title}>Pitch Bird</Text>
        </View>
      </View>
    )
  }

  // Render menu
  if (gameState === 'menu') {
    return (
      <View style={styles.container}>
        {/* Background matching score page */}
        <View style={styles.scoreBackground}>
          <View style={styles.scoreGradientOverlay} />
        </View>
        
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => handleGameExit(navigation as any)}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.menuContainer}>
          {/* Game name at top */}
          <Text style={styles.title}>Pitch Bird</Text>
          
          {/* Difficulty buttons - 3 horizontally aligned */}
          <View style={styles.settingsContainer}>
            <Text style={styles.settingsTitle}>Difficulty</Text>
            <View style={styles.buttonRow}>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.settingButton,
                    difficulty === diff && styles.selectedButton
                  ]}
                  onPress={() => setDifficulty(diff)}
                >
                  <Text style={[
                    styles.buttonText,
                    difficulty === diff && styles.selectedButtonText
                  ]}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* BPM buttons - horizontally aligned */}
          <View style={styles.settingsContainer}>
            <Text style={styles.settingsTitle}>BPM</Text>
            <View style={styles.buttonRow}>
              {([20, 40, 60, 120] as BPM[]).map(bpmValue => (
                <TouchableOpacity
                  key={bpmValue}
                  style={[
                    styles.settingButton,
                    bpm === bpmValue && styles.selectedButton
                  ]}
                  onPress={() => setBpm(bpmValue)}
                >
                  <Text style={[
                    styles.buttonText,
                    bpm === bpmValue && styles.selectedButtonText
                  ]}>
                    {bpmValue}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Start game button at bottom */}
          <TouchableOpacity style={styles.playButton} onPress={startGame}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.playButtonText}>Start Game</Text>
          </TouchableOpacity>
          
          {!isActive && (
            <View style={styles.warningContainer}>
              <MaterialCommunityIcons name="microphone-off" size={20} color="#ff6b6b" />
              <Text style={styles.warningText}>
                {micAccess !== "granted" ? "Microphone access required" : "Initializing microphone..."}
              </Text>
            </View>
          )}
        </View>
      </View>
    )
  }
  
  // Render game over screen
  if (gameState === 'gameOver') {
    return (
      <View style={styles.scoreMainContainer}>
        {/* Enhanced Background */}
        <View style={styles.scoreBackground}>
          <View style={styles.scoreGradientOverlay} />
          
          {/* Floating score elements */}
          <View style={styles.scoreFloatingElement1} />
          <View style={styles.scoreFloatingElement2} />
        </View>
        
        <View style={styles.enhancedGameOverContainer}>
          {/* Enhanced Title Section */}
          <View style={styles.gameOverTitleSection}>
            <View style={styles.gameOverTitleGlow} />
            <Text style={styles.enhancedGameOverTitle}>🎵 Game Complete!</Text>
            <View style={styles.gameOverSubtitleContainer}>
              <Ionicons name="trophy" size={20} color="#FFD700" />
              <Text style={styles.gameOverSubtitle}>Your Performance Summary</Text>
            </View>
          </View>

          {/* Enhanced Score Display */}
          <View style={styles.mainScoreContainer}>
            <View style={styles.scoreIconContainer}>
              <Ionicons name="musical-notes" size={32} color="#FFD700" />
            </View>
            <Text style={styles.enhancedScoreText}>{score}</Text>
            <Text style={styles.scoreLabel}>Notes Completed</Text>
          </View>
          
          {/* Enhanced Accuracy Display */}
          <View style={styles.enhancedAccuracySection}>
            <View style={styles.accuracyHeader}>
              <Ionicons name="analytics" size={24} color="#4CAF50" />
              <Text style={styles.accuracySectionTitle}>Accuracy Breakdown</Text>
            </View>
            
            <View style={styles.accuracyGrid}>
              {/* Note Accuracy Card */}
              {noteAccuracies.length > 0 && (
                <View style={styles.accuracyCard}>
                  <View style={styles.accuracyCardHeader}>
                    <Ionicons name="musical-note" size={20} color="#2196F3" />
                    <Text style={styles.accuracyCardTitle}>Note Accuracy</Text>
                  </View>
                  <Text style={styles.accuracyCardValue}>
                    {(noteAccuracies.reduce((sum, acc) => sum + acc, 0) / noteAccuracies.length).toFixed(1)}%
                  </Text>
                  <Text style={styles.accuracyCardDescription}>Average per note</Text>
                </View>
              )}
              
              {/* Cycles Completed Card */}
              <View style={styles.accuracyCard}>
                <View style={styles.accuracyCardHeader}>
                  <Ionicons name="refresh" size={20} color="#FF9800" />
                  <Text style={styles.accuracyCardTitle}>Cycles</Text>
                </View>
                <Text style={styles.accuracyCardValue}>{cycle}</Text>
                <Text style={styles.accuracyCardDescription}>Completed</Text>
              </View>
              
              {/* Overall Accuracy Card */}
              <View style={[styles.accuracyCard, styles.overallAccuracyCard]}>
                <View style={styles.accuracyCardHeader}>
                  <Ionicons name="trophy" size={20} color="#FFD700" />
                  <Text style={styles.accuracyCardTitle}>Overall</Text>
                </View>
                {(() => {
                  const accuracy = getOverallAccuracy()
                  if (accuracy.cycleAccuracy !== null) {
                    return (
                      <>
                        <Text style={styles.overallAccuracyValue}>
                          {accuracy.cycleAccuracy.toFixed(1)}%
                        </Text>
                        <Text style={styles.accuracyCardDescription}>Cycle Average</Text>
                      </>
                    )
                  } else if (accuracy.noteAccuracy !== null) {
                    return (
                      <>
                        <Text style={styles.overallAccuracyValue}>
                          {accuracy.noteAccuracy.toFixed(1)}%
                        </Text>
                        <Text style={styles.accuracyCardDescription}>Note Average</Text>
                      </>
                    )
                  }
                  return (
                    <>
                      <Text style={styles.overallAccuracyValue}>--</Text>
                      <Text style={styles.accuracyCardDescription}>No Data</Text>
                    </>
                  )
                })()}
              </View>
            </View>
          </View>
          
          <View style={styles.enhancedButtonRow}>
            <TouchableOpacity style={styles.enhancedActionButton} onPress={startGame}>
              <View style={styles.actionButtonGlow} />
              <View style={styles.actionButtonContent}>
                <Ionicons name="refresh" size={24} color="#fff" />
                <Text style={styles.enhancedActionButtonText}>PLAY AGAIN</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.enhancedActionButton, styles.menuActionButton]} onPress={resetGame}>
              <View style={styles.actionButtonContent}>
                <Ionicons name="home" size={24} color="#fff" />
                <Text style={styles.enhancedActionButtonText}>MENU</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }
  
  // Render playing game
  return (
    <View style={styles.container}>
      {/* Scrolling Background */}
      {(gameState === 'playing' || gameState === 'dying') && (
        <>
          {/* First background image */}
          <RNImage
            source={require('./assets/background.jpg')}
            style={{
              position: 'absolute',
              left: -backgroundOffset,
              top: 0,
              width: width,
              height: height,
              zIndex: 1,
            }}
            resizeMode="cover"
          />
          {/* Second background image for seamless scrolling */}
          <RNImage
            source={require('./assets/background.jpg')}
            style={{
              position: 'absolute',
              left: width - backgroundOffset,
              top: 0,
              width: width,
              height: height,
              zIndex: 1,
            }}
            resizeMode="cover"
          />
        </>
      )}
      
      {renderGame}
      
      {/* Pipe Images - using separate top and bottom pole images */}
      {(gameState === 'playing' || gameState === 'dying') && pipes.map(pipe => (
        <React.Fragment key={`pipe-${pipe.id}`}>
          {/* Top pipe */}
          <RNImage
            source={require('./assets/top-pole.png')}
            style={{
              position: 'absolute',
              left: pipe.x,
              top: 0,
              width: pipe.width,
              height: pipe.topHeight,
              zIndex: 3,
            }}
            resizeMode="stretch"
          />
          {/* Bottom pipe */}
          <RNImage
            source={require('./assets/bottom-pole.png')}
            style={{
              position: 'absolute',
              left: pipe.x,
              top: pipe.bottomY,
              width: pipe.width,
              height: height - pipe.bottomY,
              zIndex: 3,
            }}
            resizeMode="stretch"
          />
        </React.Fragment>
      ))}
      
      {/* Animated Bird Overlay */}
      {(gameState === 'playing' || gameState === 'dying') && (
        <RNImage
          source={require('./assets/flappy-bird-gif.gif')}
          style={{
            position: 'absolute',
            left: bird.x - 5,
            top: bird.y - 5,
            width: BIRD_SIZE * 1.2,
            height: BIRD_SIZE * 1.2,
            zIndex: 5,
          }}
          resizeMode="contain"
        />
      )}
      
      {/* Game UI overlay - All in top left, stacked vertically */}
      {(gameState === 'playing' || gameState === 'dying') && (
        <View style={[styles.gameUIContainer, { zIndex: 10 }]}>
          {/* Score Container */}
          <View style={styles.scoreContainer}>
            <Text style={styles.gameScore}>Score: {score}</Text>
          </View>
          
          {/* Cycle Container */}
          <View style={styles.cycleContainer}>
            <Text style={styles.cycleInfo}>Cycle: {cycle}</Text>
          </View>
          
          {/* Pitch Info Container */}
          <View style={styles.pitchContainer}>
            {gameState === 'dying' ? (
              <Text style={[styles.pitchIndicator, { color: '#ff6b6b' }]}>
                💥 GAME OVER
              </Text>
            ) : (
              <>
                {(() => {
                  const timeSinceStart = Date.now() - gameStartTime.current
                  const gracePeriod = 3000
                  const isInGracePeriod = timeSinceStart < gracePeriod
                  
                  if (isInGracePeriod) {
                    const remainingTime = Math.ceil((gracePeriod - timeSinceStart) / 1000)
                    return (
                      <Text style={[styles.pitchIndicator, { color: '#ffd700' }]}>
                        🛡️ Grace Period: {remainingTime}s
                      </Text>
                    )
                  }
                  
                  if (pitch > 0) {
                    return (
                      <>
                        <Text style={styles.pitchLabel}>Pitch: {pitch.toFixed(1)} Hz</Text>
                        <Text style={[styles.pitchStatus, { 
                          color: isPitchDetectedRef.current ? '#00ff88' : '#fff' 
                        }]}>
                          {isPitchDetectedRef.current ? '🎵 Flying' : '⬇️ Falling'}
                        </Text>
                      </>
                    )
                  }
                  
                  return <Text style={styles.pitchLabel}>Pitch: --</Text>
                })()}
              </>
            )}
          </View>
          
          {/* Accuracy Container */}
          {(() => {
            const accuracy = getOverallAccuracy()
            if (accuracy.cycleAccuracy !== null || accuracy.noteAccuracy !== null) {
              return (
                <View style={styles.accuracyContainer}>
                  {accuracy.cycleAccuracy !== null ? (
                    <Text style={styles.accuracyLabel}>
                      Cycle: {accuracy.cycleAccuracy.toFixed(1)}%
                    </Text>
                  ) : (
                    <Text style={styles.accuracyLabel}>
                      Note: {accuracy.noteAccuracy!.toFixed(1)}%
                    </Text>
                  )}
                </View>
              )
            }
            return null
          })()}
        </View>
      )}
      
      
      <TouchableOpacity style={styles.pauseButton} onPress={resetGame}>
        <Ionicons name="pause" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 18,
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 40,
  },
  songContainer: {
    backgroundColor: 'rgba(52, 73, 94, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  songTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  songInfo: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  settingsContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  settingButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    minWidth: 60,
  },
  selectedButton: {
    backgroundColor: '#3498db',
  },
  buttonText: {
    color: '#2c3e50',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  selectedButtonText: {
    color: '#fff',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    gap: 10,
  },
  warningText: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 20,
    gap: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  instructionContainer: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 24,
    color: '#2c3e50',
    marginBottom: 10,
  },
  cycleText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    margin: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  gameUIContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'column',
    gap: 10,
  },
  scoreContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cycleContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pitchContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  accuracyContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gameScore: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cycleInfo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pitchLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pitchStatus: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: 'bold',
  },
  accuracyLabel: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pitchIndicator: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: 'bold',
  },
  accuracySection: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    alignItems: 'center' as const,
  },
  accuracyDetailText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
  accuracyMainText: {
    fontSize: 22,
    color: '#FFD700',
    marginTop: 10,
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
  pauseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20,
  },

  // Enhanced Menu Styles
  menuMainContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#4A90E2',
  },
  menuGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  floatingElement1: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  floatingElement2: {
    position: 'absolute',
    top: '60%',
    right: '15%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  floatingElement3: {
    position: 'absolute',
    bottom: '25%',
    left: '20%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  enhancedBackButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 48,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  titleGlow: {
    position: 'absolute',
    width: 200,
    height: 100,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 50,
    top: -10,
  },
  enhancedTitle: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  enhancedSongContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  songIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  songTextContainer: {
    flex: 1,
  },
  enhancedSongTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  enhancedSongInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  enhancedInstructionContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  enhancedInstructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  instructionSteps: {
    gap: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  enhancedInstructionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  enhancedSettingsContainer: {
    marginBottom: 30,
    gap: 25,
  },
  settingSection: {
    alignItems: 'center',
  },
  enhancedSettingsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  enhancedButtonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  enhancedSettingButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    minWidth: 80,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  enhancedSelectedButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFA000',
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  enhancedButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  enhancedSelectedButtonText: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  buttonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    backgroundColor: 'transparent',
    opacity: 0,
  },
  selectedButtonGlow: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    opacity: 1,
  },
  enhancedPlayButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  playButtonGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 40,
    backgroundColor: 'rgba(39, 174, 96, 0.3)',
  },
  playButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  enhancedPlayButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  playButtonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
  },
  enhancedWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    gap: 12,
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedWarningText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    flex: 1,
    fontWeight: '500',
  },

  // Enhanced Score Page Styles
  scoreMainContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scoreBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2c3e50',
  },
  scoreGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  scoreFloatingElement1: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  scoreFloatingElement2: {
    position: 'absolute',
    bottom: '20%',
    left: '5%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  enhancedGameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverTitleSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  gameOverTitleGlow: {
    position: 'absolute',
    width: 250,
    height: 80,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 40,
    top: -5,
  },
  enhancedGameOverTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  gameOverSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameOverSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  mainScoreContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 25,
    borderRadius: 20,
    marginBottom: 30,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  scoreIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  enhancedScoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  scoreLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  enhancedAccuracySection: {
    width: '100%',
    marginBottom: 30,
  },
  accuracyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  accuracySectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  accuracyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },
  accuracyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
    flex: 1,
    maxWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  overallAccuracyCard: {
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  accuracyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  accuracyCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  accuracyCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  overallAccuracyValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  accuracyCardDescription: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  enhancedActionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    margin: 8,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  menuActionButton: {
    backgroundColor: '#7f8c8d',
  },
  actionButtonGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 30,
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enhancedActionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
})
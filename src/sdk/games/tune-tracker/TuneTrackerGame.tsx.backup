// TuneTrackerGame.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { View, useWindowDimensions, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Canvas, Path, Skia, vec, Line, Fill } from "@shopify/react-native-skia"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"

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
export const TuneTrackerGame = ({ notes }: { notes?: any }) => {
  const { width, height } = useWindowDimensions()
  const navigation = useNavigation()

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
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [pitch, setPitch] = useState(-1)

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

  // process notes payload
  const processNotesData = useCallback(() => {
    if (!notes?.measures) return []
    const all: any[] = []
    const sortedMeasures = [...notes.measures].sort((a: any, b: any) => a.measure_number - b.measure_number)
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
  }, [notes, pitchToFrequency])

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
  }, [playDataUriWithExpo])

  // center-line checker for segments — play harmonic if center lies inside a segment
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

  // Simple microphone status logging
  useEffect(() => {
    if (isRecording) {
      console.log(`🎤 TuneTrackerGame: Microphone status - Access: ${micAccess}, Active: ${isActive}`);
    }
  }, [isRecording, micAccess, isActive])

  // viewport animation RAF
  const animate = useCallback(() => {
    if (isRecording && !isPaused) {
      setViewportCenterFreq(current => {
        const diff = targetCenterFreq - current
        if (Math.abs(diff) < 0.1) return targetCenterFreq
        return current + diff * TRANSITION_SPEED
      })
      setRenderTrigger(r => r + 1)
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [isRecording, isPaused, targetCenterFreq])

  useEffect(() => {
    if (isRecording && !isPaused) {
      startTimeRef.current = Date.now()
      animationFrameRef.current = requestAnimationFrame(animate)
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }
  }, [isRecording, isPaused, animate])


  // Process audio buffer with DSP module for pitch detection with noise reduction
  useEffect(() => {
    if (!audioBuffer || audioBuffer.length === 0 || !sampleRate || !isRecording || isPaused || !isActive) return;
    
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
  }, [audioBuffer, sampleRate, bufferId, isRecording, isPaused, isActive, idQ, pitchQ, rmsQ, addRMS, addPitch])

  // pitch plotting: ensure points are added as before (timestamp + frequency)
  // Color calculation is now inlined to prevent dependency issues

  useEffect(() => {
    if (!isRecording || isPaused || !isActive) return
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
  }, [pitch, bufferId, isRecording, isPaused, isActive, addId, idQ]) 
  // Note: Intentionally not including checkViewportBounds, getCurrentTargetFrequency to prevent plotting breaks during color changes

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
        return { frequency: s.frequency, note: s.pitch }
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

    // Determine pitch line color based on proximity to target
    const targetInfo = getCurrentTargetInfo()
    let pitchLineColor = '#FFFFFF' // default white (no voice or no target)
    
    if (targetInfo && pitch > 0) {
      const diff = Math.abs(pitch - targetInfo.frequency)
      if (diff <= 3) {
        pitchLineColor = '#00FF00' // green: within ±3Hz
      } else if (diff <= 6) {
        pitchLineColor = '#FFFF00' // yellow: within ±6Hz
      } else {
        pitchLineColor = '#FF0000' // red: more than ±6Hz
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
  }, [graphWidth, graphHeight, pitchPoints, targetSegments, viewportCenterFreq, renderTrigger, pitch, getCurrentTargetInfo])

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

  // play/stop toggle
  const handlePlayStopToggle = useCallback(() => {
    if (isRecording) {
      setIsRecording(false)
      setIsPaused(false)
      setPitchPoints([])
      setActiveNoteIndex(-1)
      setTargetSegments([])
      appendControllerRef.current.running = false
      appendControllerRef.current.nextStartMs = null
      harmonicsSetRef.current.clear()
      const opt = calculateViewportCenter()
      setViewportCenterFreq(opt)
      setTargetCenterFreq(opt)
      pitchStabilityBuffer.current = []
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
  }, [isRecording, calculateViewportCenter])

  if (micAccess === "denied") return <RequireMicAccess />
  if (micAccess === "pending" || micAccess === "requesting") return null

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => handleGameExit(navigation as any)}>
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

          {/* Current pitch display */}
          {pitch > 0 && isRecording && !isPaused && (
            <View style={styles.hzDisplayTopRight}>
              <Text style={styles.hzTextTopRight}>{pitch.toFixed(1)} Hz</Text>
            </View>
          )}

          {/* Target note display */}
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
              return (
                <View style={styles.targetNoteDisplay}>
                  <Text style={styles.targetNoteText}>Target: {targetInfo.note}</Text>
                  <Text style={styles.targetFreqText}>{targetInfo.frequency.toFixed(1)} Hz</Text>
                  {pitch > 0 && (
                    <>
                      <View style={styles.frequencyDivider} />
                      <Text style={styles.currentFreqLabel}>Current:</Text>
                      <Text style={styles.currentFreqText}>{pitch.toFixed(1)} Hz</Text>
                    </>
                  )}
                </View>
              )
            }
            return null
          })()}
        </View>
      </View>

      {/* Play/Stop */}
      <TouchableOpacity style={styles.mainControlButton} onPress={handlePlayStopToggle}>
        <Ionicons name={isRecording ? "stop" : "play"} size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

// styles (unchanged)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  topBar: { height: 40, backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
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
  targetNoteDisplay: { position: 'absolute', top: 70, right: 16, backgroundColor: 'rgba(255, 215, 0, 0.9)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFD700', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, zIndex: 10, minWidth: 100 },
  targetNoteText: { color: '#1a1a1a', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  targetFreqText: { color: '#2c3e50', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  frequencyDivider: { height: 1, backgroundColor: 'rgba(26, 26, 26, 0.3)', marginVertical: 6, marginHorizontal: 4 },
  currentFreqLabel: { color: '#1a1a1a', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  currentFreqText: { color: '#2c3e50', fontSize: 12, fontWeight: '600', textAlign: 'center' },
})

export default TuneTrackerGame




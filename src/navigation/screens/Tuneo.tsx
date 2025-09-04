import React, { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { View, useWindowDimensions, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Canvas, Path, Skia, LinearGradient, vec, Line, Circle, RoundedRect, Fill, Group, Paint, Blur } from "@shopify/react-native-skia"
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"

import { useGlobalPitchDetection } from "@/hooks/useGlobalPitchDetection"
import { useTranslation } from "@/configHooks"
import { Chromatic, Guitar, Instrument } from "@/instruments"
import { useUiStore } from "@/stores/uiStore"
import { frequencyToNote } from "@/utils/noteParser"
import { RequireMicAccess } from "@/components/RequireMicAccess"

const TEST_MODE = false

const BUF_SIZE = 4096 // Reduced for faster processing (~93ms at 44kHz)
const MIN_FREQ = 60
const MAX_FREQ = 6000
const MAX_PITCH_DEV = 0.3 // More tolerance for fast changes
const THRESHOLD_DEFAULT = 0.08 // Lower for better sensitivity
const THRESHOLD_NOISY = 0.25 // Reduced for faster detection
const RMS_GAP = 1.3 // Relaxed for quicker response
const ENABLE_FILTER = false // Disabled for maximum responsiveness
const BUF_PER_SEC = 43 // Approximate value from the global microphone system

// Ultra-performance constants
const PIXELS_PER_SECOND = 60 // Smooth scrolling
const MAX_PITCH_POINTS = 100 // More points for smoothness
const POINT_LIFETIME_MS = 8000 // Optimal lifetime
// Removed render throttling for seamless display

type MicrophoneAccess = "pending" | "granted" | "denied"

// Piano notes for display - extended range
const PIANO_NOTES = [
  "C6", "B5", "A#5", "A5", "G#5", "G5", "F#5", "F5", "E5", "D#5", "D5", "C#5", "C5",
  "B4", "A#4", "A4", "G#4", "G4", "F#4", "F4", "E4", "D#4", "D4", "C#4", "C4",
  "B3", "A#3", "A3", "G#3", "G3", "F#3", "F3", "E3", "D#3", "D3", "C#3", "C3",
  "B2", "A#2", "A2", "G#2", "G2", "F#2", "F2", "E2", "D#2", "D2", "C#2", "C2"
]

const NOTE_FREQUENCIES_MAP: { [key: string]: number } = {
  'C0': 16.35,
  'C#0': 17.32,
  'D0': 18.35,
  'D#0': 19.45,
  'E0': 20.60,
  'F0': 21.83,
  'F#0': 23.12,
  'G0': 24.50,
  'G#0': 25.96,
  'A0': 27.50,
  'A#0': 29.14,
  'B0': 30.87,
  'C1': 32.70,
  'C#1': 34.65,
  'D1': 36.71,
  'D#1': 38.89,
  'E1': 41.20,
  'F1': 43.65,
  'F#1': 46.25,
  'G1': 49.00,
  'G#1': 51.91,
  'A1': 55.00,
  'A#1': 58.27,
  'B1': 61.74,
  'C2': 65.41,
  'C#2': 69.30,
  'D2': 73.42,
  'D#2': 77.78,
  'E2': 82.41,
  'F2': 87.31,
  'F#2': 92.50,
  'G2': 98.00,
  'G#2': 103.83,
  'A2': 110.00,
  'A#2': 116.54,
  'B2': 123.47,
  'C3': 130.81,
  'C#3': 138.59,
  'D3': 146.83,
  'D#3': 155.56,
  'E3': 164.81,
  'F3': 174.61,
  'F#3': 185.00,
  'G3': 196.00,
  'G#3': 207.65,
  'A3': 220.00,
  'A#3': 233.08,
  'B3': 246.94,
  'C4': 261.63,
  'C#4': 277.18,
  'D4': 293.66,
  'D#4': 311.13,
  'E4': 329.63,
  'F4': 349.23,
  'F#4': 369.99,
  'G4': 392.00,
  'G#4': 415.30,
  'A4': 440.00,
  'A#4': 466.16,
  'B4': 493.88,
  'C5': 523.25,
  'C#5': 554.37,
  'D5': 587.33,
  'D#5': 622.25,
  'E5': 659.25,
  'F5': 698.46,
  'F#5': 739.99,
  'G5': 783.99,
  'G#5': 830.61,
  'A5': 880.00,
  'A#5': 932.33,
  'B5': 987.77,
  'C6': 1046.50,
  'C#6': 1108.73,
  'D6': 1174.66,
  'D#6': 1244.51,
  'E6': 1318.51,
  'F6': 1396.91,
  'F#6': 1479.98,
  'G6': 1567.98,
  'G#6': 1661.22,
  'A6': 1760.00,
  'A#6': 1864.66,
  'B6': 1975.53,
  'C7': 2093.00,
  'C#7': 2217.46,
  'D7': 2349.32,
  'D#7': 2489.02,
  'E7': 2637.02,
  'F7': 2793.83,
  'F#7': 2959.96,
  'G7': 3135.96,
  'G#7': 3322.44,
  'A7': 3520.00,
  'A#7': 3729.31,
  'B7': 3951.07,
  'C8': 4186.01
};

export const Tuneo = () => {
  const { width, height } = useWindowDimensions()
  const navigation = useNavigation()
  const t = useTranslation()
  
  // Use the global pitch detection system
  const { 
    pitch, 
    rms, 
    audioBuffer, 
    bufferId, 
    sampleRate, 
    isActive, 
    micAccess, 
    requestPermission,
    startStreaming 
  } = useGlobalPitchDetection()

  // Note: sampleRate, audioBuffer, bufferId, micAccess, and pitch are now provided by useGlobalPitchDetection
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  
  // Fixed pitch tracking for real-time rendering
  const [pitchPoints, setPitchPoints] = useState<{ x: number; y: number; timestamp: number }[]>([])
  const [currentNote, setCurrentNote] = useState<string>("")
  const [activeNoteIndex, setActiveNoteIndex] = useState<number>(-1)
  const startTime = useRef<number>(Date.now())
  const [renderTrigger, setRenderTrigger] = useState(0) // Force re-renders
  const animationFrameRef = useRef<number>()
  const lastProcessTime = useRef<number>(0) // Track processing time
  const prevPitch = useRef<number>(0) // Track previous pitch for change detection
  const lastValidPitch = useRef<number>(0) // Store last valid pitch for continuation
  
  // Rolling window state
  const [viewportCenterFreq, setViewportCenterFreq] = useState<number>(440) // Default to A4
  const [targetCenterFreq, setTargetCenterFreq] = useState<number>(440)
  const VIEWPORT_SEMITONES = 24 // Show 2 octaves worth of notes (12 notes per octave)
  const TRANSITION_SPEED = 0.1 // Smooth transition factor
  const SLIDING_STEP_HZ = 80 // Fixed Hz step for sliding
  const STABILITY_FRAMES = 5 // Number of consistent frames before sliding
  const pitchStabilityBuffer = useRef<number[]>([]) // Buffer to track pitch stability

  const rmsQ = useUiStore((state) => state.rmsHistory)
  const idQ = useUiStore((state) => state.idHistory)
  const addPitch = useUiStore((state) => state.addPitch)
  const addRMS = useUiStore((state) => state.addRMS)
  const addId = useUiStore((state) => state.addId)

  // Calculate layout dimensions
  const topBarHeight = 80
  const bottomBarHeight = 80
  const pianoWidth = 80
  const graphWidth = width - pianoWidth
  const graphHeight = height - topBarHeight - bottomBarHeight

  // Microphone permissions are now handled by the global system
  useEffect(() => {
    if (micAccess === 'pending') {
      requestPermission()
    }
  }, [micAccess, requestPermission])

  // Audio buffer management is now handled by the global microphone system
  useEffect(() => {
    if (!isRecording || isPaused) return
    
    // Start streaming if not already active
    if (micAccess === 'granted' && !isActive) {
      startStreaming()
    }
  }, [isRecording, isPaused, micAccess, isActive, startStreaming])

  // Seamless animation without throttling + viewport smoothing
  const animate = useCallback(() => {
    if (isRecording && !isPaused) {
      // Smooth viewport center transition
      setViewportCenterFreq(current => {
        const diff = targetCenterFreq - current
        if (Math.abs(diff) < 0.1) return targetCenterFreq
        return current + diff * TRANSITION_SPEED
      })
      
      setRenderTrigger(prev => prev + 1)
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [isRecording, isPaused, targetCenterFreq, TRANSITION_SPEED])

  useEffect(() => {
    if (isRecording && !isPaused) {
      startTime.current = Date.now()
      animationFrameRef.current = requestAnimationFrame(animate)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isRecording, isPaused, animate])

  // Dynamic viewport-based frequency to Y mapping
  const freqToY = useCallback((freq: number) => {
    if (freq <= 0) return graphHeight / 2
    
    // Calculate viewport bounds based on center frequency
    const semitoneRatio = Math.pow(2, 1/12) // 12th root of 2
    const halfRange = VIEWPORT_SEMITONES / 2
    const minFreq = viewportCenterFreq / Math.pow(semitoneRatio, halfRange)
    const maxFreq = viewportCenterFreq * Math.pow(semitoneRatio, halfRange)
    
    // Clamp frequency to current viewport
    const clampedFreq = Math.max(minFreq, Math.min(maxFreq, freq))
    
    // Logarithmic mapping within the viewport
    const logMin = Math.log2(minFreq)
    const logMax = Math.log2(maxFreq)
    const logFreq = Math.log2(clampedFreq)
    
    // Normalize to 0-1 range within viewport
    const normalized = (logFreq - logMin) / (logMax - logMin)
    
    // Convert to Y position (invert - higher frequencies at top)
    const y = graphHeight - (normalized * graphHeight)
    
    return Math.max(0, Math.min(graphHeight, y))
  }, [graphHeight, viewportCenterFreq, VIEWPORT_SEMITONES])

  // Process pitch data from the global microphone system
  useEffect(() => {
    if (!isRecording || isPaused || !isActive) return

    if (bufferId === idQ[idQ.length - 1]) return
    
    addId(bufferId)
    addPitch(pitch)
    addRMS(rms)

    // Plot when we have pitch detection OR continue with last valid pitch
    if (pitch > 0) {
      // Check if pitch is outside viewport bounds and stable
      const bounds = checkViewportBounds(pitch)
      const isStable = isPitchStable(pitch)
      
      if (isStable && (bounds.isAbove || bounds.isBelow)) {
        // Slide viewport by fixed Hz step in the appropriate direction
        if (bounds.isAbove) {
          setTargetCenterFreq(prev => prev + SLIDING_STEP_HZ)
        } else if (bounds.isBelow) {
          setTargetCenterFreq(prev => prev - SLIDING_STEP_HZ)
        }
      }
      
      // Find closest note in our piano
      let closestNote = ""
      let closestIndex = -1
      let minDiff = Infinity
      
      // Find closest note from all available notes (same logic as note highlighting)
      for (const [note, noteFreq] of Object.entries(NOTE_FREQUENCIES_MAP)) {
        const diff = Math.abs(pitch - noteFreq)
        if (diff < minDiff) {
          minDiff = diff
          closestNote = note
          // Find index in PIANO_NOTES for display
          closestIndex = PIANO_NOTES.indexOf(note)
        }
      }

      if (closestNote) {
        setCurrentNote(closestNote)
        setActiveNoteIndex(closestIndex)
      }

      // Store and plot the detected pitch immediately
      lastValidPitch.current = pitch
      
      const y = freqToY(pitch) // Dynamic mapping
      
      setPitchPoints(prevPoints => {
        const now = Date.now()
        const newPoint = { x: 0, y, timestamp: now }
        
        // Efficient single-pass cleanup
        return [...prevPoints, newPoint]
          .filter(p => now - p.timestamp < POINT_LIFETIME_MS)
          .slice(-MAX_PITCH_POINTS)
      })
      
      // Update previous pitch only when we have actual detection
      if (pitch > 0) {
        prevPitch.current = pitch
      }
    } else if (lastValidPitch.current > 0) {
      // Continue plotting horizontal line at last valid frequency
      const timestamp = Date.now()
      const y = freqToY(lastValidPitch.current)
      
      setPitchPoints(prevPoints => {
        // Add continuation point at regular intervals for horizontal line
        const lastPoint = prevPoints[prevPoints.length - 1]
        const shouldAddPoint = !lastPoint || timestamp - lastPoint.timestamp > 16 // 60 FPS continuation (16ms)
        
        if (shouldAddPoint) {
          const newPoint = { x: 0, y, timestamp }
          
          // Efficient single-pass cleanup
          return [...prevPoints, newPoint]
            .filter(p => timestamp - p.timestamp < POINT_LIFETIME_MS)
            .slice(-MAX_PITCH_POINTS)
        }
        
        return prevPoints
      })
    }
  }, [pitch, rms, bufferId, isRecording, isPaused, isActive, addId, addPitch, addRMS, idQ, freqToY])

  const getNoteCents = (freq: number, targetNote: string) => {
    const targetFreq = NOTE_FREQUENCIES_MAP[targetNote]
    if (!targetFreq || freq <= 0) return 0
    return Math.round(1200 * Math.log2(freq / targetFreq))
  }

  // Check if pitch is outside current viewport bounds
  const checkViewportBounds = (pitch: number) => {
    const semitoneRatio = Math.pow(2, 1/12)
    const halfRange = VIEWPORT_SEMITONES / 2
    const minFreq = targetCenterFreq / Math.pow(semitoneRatio, halfRange)
    const maxFreq = targetCenterFreq * Math.pow(semitoneRatio, halfRange)
    
    return {
      isAbove: pitch > maxFreq,
      isBelow: pitch < minFreq,
      minFreq,
      maxFreq
    }
  }

  // Check if pitch is stable enough to trigger viewport slide
  const isPitchStable = (newPitch: number) => {
    const buffer = pitchStabilityBuffer.current
    buffer.push(newPitch)
    
    // Keep only recent frames
    if (buffer.length > STABILITY_FRAMES) {
      buffer.shift()
    }
    
    // Need minimum frames for stability check
    if (buffer.length < STABILITY_FRAMES) {
      return false
    }
    
    // Check if all recent pitches are within a small Hz range
    const avgPitch = buffer.reduce((sum, p) => sum + p, 0) / buffer.length
    const maxDeviation = Math.max(...buffer.map(p => Math.abs(p - avgPitch)))
    
    return maxDeviation < 10 // Less than 10 Hz deviation
  }

  // Dynamic grid lines based on current viewport
  const gridLines = useMemo(() => {
    const gridNotes = []
    const semitoneRatio = Math.pow(2, 1/12)
    const halfRange = VIEWPORT_SEMITONES / 2
    const minFreq = viewportCenterFreq / Math.pow(semitoneRatio, halfRange)
    const maxFreq = viewportCenterFreq * Math.pow(semitoneRatio, halfRange)
    
    // Find notes within current viewport
    for (const [note, freq] of Object.entries(NOTE_FREQUENCIES_MAP)) {
      if (freq >= minFreq && freq <= maxFreq) {
        // Add grid lines for octave notes (C notes) and fifths
        if (note.includes('C') || note.includes('G')) {
          const y = freqToY(freq)
          gridNotes.push({ key: note, y, freq })
        }
      }
    }
    
    return gridNotes
  }, [viewportCenterFreq, VIEWPORT_SEMITONES, freqToY])

  const renderGraph = useMemo(() => {
    
    // Build the path outside the JSX
    let pitchPath = null
    const pointsLength = pitchPoints.length
    
    if (pointsLength > 0 && isRecording && !isPaused) { // Start with any points
      const currentTime = Date.now()
      const path = Skia.Path.Make()
      let started = false
      const halfWidth = graphWidth / 2
      const pixelsPerMs = PIXELS_PER_SECOND / 1000

      // Collect visible points with generous boundaries
      const visiblePoints = []
      
      for (let i = 0; i < pointsLength; i++) {
        const point = pitchPoints[i]
        const timeDiff = currentTime - point.timestamp
        const x = halfWidth - timeDiff * pixelsPerMs
        
        // Optimized boundaries for performance
        if (x >= -200 && x <= graphWidth + 200) {
          visiblePoints.push({ x, y: point.y })
        }
      }
      
      
      // Optimized line drawing for maximum performance
      if (visiblePoints.length >= 2) {
        path.moveTo(visiblePoints[0].x, visiblePoints[0].y)
        
        // Use direct lines for best performance and accuracy
        for (let i = 1; i < visiblePoints.length; i++) {
          path.lineTo(visiblePoints[i].x, visiblePoints[i].y)
        }
        
        started = true
      }

      if (started) {
        pitchPath = path
      }
    }

    // Current pitch is always at center in sliding window mode
    const halfWidth = graphWidth / 2

    return (
      <Canvas style={{ width: graphWidth, height: graphHeight }}>
        <Fill color="#1a1a1a" />
        
        {/* Grid lines - pre-calculated */}
        {gridLines.map((line) => (
          <Line
            key={line.key}
            p1={vec(0, line.y)}
            p2={vec(graphWidth, line.y)}
            color="#2a2a2a"
            strokeWidth={0.5}
          />
        ))}

        {/* Center reference line */}
        <Line
          p1={vec(halfWidth, 0)}
          p2={vec(halfWidth, graphHeight)}
          color="#3a3a3a"
          strokeWidth={1}
        />

        {/* Pitch line - persistent and visible */}
        {pitchPath && (
          <Path
            path={pitchPath}
            color="#ffffff"
            style="stroke"
            strokeWidth={1}
            strokeCap="round"
            strokeJoin="round"
          />
        )}

        {/* Current position indicator with accurate Y position */}
        {(pitch > 0 || lastValidPitch.current > 0) && isRecording && !isPaused && (
          <Circle
            cx={halfWidth}
            cy={pitch > 0 ? freqToY(pitch) : freqToY(lastValidPitch.current)}
            r={3}
            color="#00ff88"
          />
        )}
      </Canvas>
    )
  }, [graphWidth, graphHeight, pitch, isRecording, isPaused, freqToY, renderTrigger, gridLines, pitchPoints])

  const pianoKeys = useMemo(() => {
    // Calculate viewport bounds
    const semitoneRatio = Math.pow(2, 1/12)
    const halfRange = VIEWPORT_SEMITONES / 2
    const minFreq = viewportCenterFreq / Math.pow(semitoneRatio, halfRange)
    const maxFreq = viewportCenterFreq * Math.pow(semitoneRatio, halfRange)
    
    // Show only notes within current viewport
    const notesWithFreqs = PIANO_NOTES.map((note, index) => {
      const noteFreq = NOTE_FREQUENCIES_MAP[note]
      if (!noteFreq || noteFreq < minFreq || noteFreq > maxFreq) return null
      
      const y = freqToY(noteFreq)
      return { note, index, y, noteFreq }
    }).filter((item): item is { note: string; index: number; y: number; noteFreq: number } => item !== null)
      .sort((a, b) => b.y - a.y)
    
    return (
      <View style={[styles.pianoContainer, { position: 'relative' }]}>
        {notesWithFreqs.map(({ note, index, y }) => {
          const isActive = index === activeNoteIndex && isRecording && !isPaused
          const isSharp = note.includes('#')
          
          return (
            <View
              key={note}
              style={[
                styles.pianoKey,
                { 
                  position: 'absolute',
                  top: Math.max(4, Math.min(graphHeight - 24, y - 12)),
                  height: 20,
                  width: isSharp ? 60 : 72,
                  left: isSharp ? 10 : 4,
                  zIndex: isSharp ? 2 : 1,
                  flex: 0, // Override flex: 1
                },
                isSharp ? styles.blackKey : styles.whiteKey,
                isActive && styles.activeKey
              ]}
            >
              <Text style={[
                styles.keyText,
                isSharp ? styles.blackKeyText : styles.whiteKeyText,
                isActive && styles.activeKeyText
              ]}>
                {note}
              </Text>
            </View>
          )
        })}
      </View>
    )
  }, [activeNoteIndex, isRecording, isPaused, freqToY, graphHeight, viewportCenterFreq, VIEWPORT_SEMITONES])


  const handlePlayStopToggle = useCallback(() => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      setIsPaused(false)
      setPitchPoints([])
      setActiveNoteIndex(-1)
      setCurrentNote("")
      // Reset viewport to A4 (440Hz)
      setViewportCenterFreq(440)
      setTargetCenterFreq(440)
      // Clear stability buffer
      pitchStabilityBuffer.current = []
    } else {
      // Start recording
      setIsRecording(true)
      setIsPaused(false)
      setPitchPoints([])
      startTime.current = Date.now()
      // Reset viewport to A4 (440Hz)
      setViewportCenterFreq(440)
      setTargetCenterFreq(440)
      // Clear stability buffer
      pitchStabilityBuffer.current = []
    }
  }, [isRecording])

  if (micAccess === "denied") {
    return <RequireMicAccess />
  }

  if (micAccess === "pending" || micAccess === "requesting") {
    return null
  }

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home' as any)}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Tuner</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main content area */}
      <View style={styles.mainContent}>
        {/* Piano keys on the left */}
        {pianoKeys}
        
        {/* Graph on the right */}
        <View style={styles.graphContainer}>
          {renderGraph}
          
          {/* Hz display - top right */}
          {pitch > 0 && isRecording && !isPaused && (
            <View style={styles.hzDisplayTopRight}>
              <Text style={styles.hzTextTopRight}>
                {pitch.toFixed(1)} Hz
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom control bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.mainControlButton}
          onPress={handlePlayStopToggle}
        >
          <Ionicons 
            name={isRecording ? "stop" : "play"} 
            size={32} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  topBar: {
    height: 80,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  pianoContainer: {
    width: 80,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  pianoKey: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#dee2e6',
    borderRadius: 6,
    marginVertical: 0.5,
    marginHorizontal: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  whiteKey: {
    backgroundColor: '#ffffff',
    borderColor: '#dee2e6',
  },
  blackKey: {
    backgroundColor: '#495057',
    borderColor: '#6c757d',
  },
  activeKey: {
    backgroundColor: '#007bff',
    borderColor: '#0056b3',
    shadowColor: '#007bff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    transform: [{ scale: 1.05 }],
  },
  keyText: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  whiteKeyText: {
    color: '#495057',
  },
  blackKeyText: {
    color: '#f8f9fa',
  },
  activeKeyText: {
    color: '#ffffff',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  graphContainer: {
    flex: 1,
    position: 'relative',
  },
  bottomBar: {
    height: 80,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  mainControlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hzDisplayTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#2c3e50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#34495e',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
  },
  hzTextTopRight: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
})
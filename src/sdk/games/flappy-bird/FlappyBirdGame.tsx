import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { View, useWindowDimensions, TouchableOpacity, Text, StyleSheet, Platform, Image as RNImage } from "react-native"
import { Canvas, Rect, Circle, Fill, Text as SkiaText, matchFont } from "@shopify/react-native-skia"
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
const GRAVITY = 0.5
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
  20: { speed: 0.5, notesPerSec: 1/3 },
  40: { speed: 1, notesPerSec: 2/3 },
  60: { speed: 1.5, notesPerSec: 1 },
  120: { speed: 3, notesPerSec: 2 }
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
  
  // Create a new pipe based on current note
  const createPipe = useCallback(() => {
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
    // Start death animation timer - bird will fall for 1.5 seconds then show game over
    deathAnimationTimer.current = setTimeout(() => {
      setGameState('gameOver')
    }, 1500)
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
          // During death animation, just apply gravity (bird falls down)
          newVelocity = prev.velocity + GRAVITY * 1.5 // Faster falling during death
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
          
          // Smooth transition to target Y position
          const transitionSpeed = 0.15 // Adjust for smoother/faster transitions
          newY = prev.y + (targetY - prev.y) * transitionSpeed
          newVelocity = (newY - prev.y) // Calculate velocity based on Y change
        } else if (!isInGracePeriod) {
          // No pitch detected and grace period over, apply gravity
          newVelocity = prev.velocity + GRAVITY
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
          const minPipeSpacing = 120 // Reduced spacing between pipes (was 250px)
          
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
          const hasEnoughSpacing = !lastPipe || (width - lastPipe.x) >= minPipeSpacing
          
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
          // Check if bird passed pipe
          if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            pipe.passed = true
            newScore++
            
            // Check if we completed a full cycle (for cycle tracking)
            if (newScore % noteSequence.length === 0 && newScore > 0) {
              cycleComplete = true
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
          setCycle(prev => prev + 1)
        }
        
        return updatedPipes
        })
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop)
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, bird, score, createPipe, bpm, height, difficulty, noteSequence.length, frequencyToY, handleGameEnd, pitch, width])
  
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
      <Canvas style={{ width, height, position: 'absolute', top: 0, left: 0 }}>
        <Fill color="#87CEEB" />
        
        {/* Pipes */}
        {pipes.map(pipe => (
          <React.Fragment key={pipe.id}>
            {/* Top pipe */}
            <Rect
              x={pipe.x}
              y={0}
              width={pipe.width}
              height={pipe.topHeight}
              color="#228B22"
            />
            {/* Bottom pipe */}
            <Rect
              x={pipe.x}
              y={pipe.bottomY}
              width={pipe.width}
              height={height - pipe.bottomY}
              color="#228B22"
            />
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
        
        {/* Bird placeholder - actual bird is rendered as overlay */}
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
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => handleGameExit(navigation as any)}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.menuContainer}>
          <Text style={styles.title}>Flappy Bird</Text>
          
          {/* Display song title if provided */}
          {notes?.title && (
            <View style={styles.songContainer}>
              <Text style={styles.songTitle}>♪ {notes.title}</Text>
              <Text style={styles.songInfo}>
                {notes.key_signature} • {notes.time_signature}
              </Text>
            </View>
          )}
                    
          {!isActive && (
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionTitle}>How to start:</Text>
              <Text style={styles.instructionText}>1. Go back to Home</Text>
              <Text style={styles.instructionText}>2. Open the Tuner first</Text>
              <Text style={styles.instructionText}>3. Allow microphone access</Text>
              <Text style={styles.instructionText}>4. Return here to play!</Text>
            </View>
          )}
          
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
                    {diff.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
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
          
          <TouchableOpacity style={styles.playButton} onPress={startGame}>
            <Ionicons name="play" size={32} color="#fff" />
            <Text style={styles.playButtonText}>START</Text>
          </TouchableOpacity>
          
          {!isActive && (
            <View style={styles.warningContainer}>
              <MaterialCommunityIcons name="microphone-off" size={24} color="#ff6b6b" />
              <Text style={styles.warningText}>
                {micAccess !== "granted" ? "Microphone access denied" : "Microphone is starting..."}
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
      <View style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>Game Over!</Text>
          <Text style={styles.scoreText}>Score: {score}</Text>
          {cycle > 0 && (
            <Text style={styles.cycleText}>Cycles Completed: {cycle}</Text>
          )}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={startGame}>
              <Text style={styles.actionButtonText}>PLAY AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={resetGame}>
              <Text style={styles.actionButtonText}>MENU</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }
  
  // Render playing game
  return (
    <View style={styles.container}>
      {renderGame}
      
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
            zIndex: 10,
          }}
          resizeMode="contain"
        />
      )}
      
      {/* Game UI overlay */}
      {(gameState === 'playing' || gameState === 'dying') && (
        <View style={styles.gameUI}>
          <View style={styles.scoreContainer}>
            <Text style={styles.gameScore}>Score: {score}</Text>
            <Text style={styles.cycleInfo}>Cycle: {cycle}</Text>
          </View>
          
          <View style={styles.noteInfo}>
            {gameState === 'dying' ? (
              <Text style={[styles.pitchIndicator, { color: '#ff6b6b' }]}>
                💥 GAME OVER
              </Text>
            ) : (
              <>
                <Text style={styles.currentNote}>
                  Pitch Control
                </Text>
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
                        <Text style={styles.yourPitch}>
                          {pitch.toFixed(1)} Hz
                        </Text>
                        <Text style={[styles.pitchIndicator, { 
                          color: isPitchDetectedRef.current ? '#00ff88' : '#fff' 
                        }]}>
                          {isPitchDetectedRef.current ? '🎵 Pitch Control!' : '⬇️ Falling'}
                        </Text>
                      </>
                    )
                  }
                  
                  return null
                })()}
              </>
            )}
          </View>
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
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
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
    color: '#2c3e50',
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
  gameUI: {
    position: 'absolute',
    top: 60,
    left: 80,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
  },
  gameScore: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cycleInfo: {
    color: '#fff',
    fontSize: 14,
  },
  toleranceInfo: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noteInfo: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  currentNote: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentFreq: {
    color: '#fff',
    fontSize: 12,
  },
  yourPitch: {
    color: '#00ff88',
    fontSize: 12,
    marginTop: 5,
  },
  pitchIndicator: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: 'bold',
  },
  pauseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20,
  },
})
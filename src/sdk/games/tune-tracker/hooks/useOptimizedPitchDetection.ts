import { useState, useRef, useCallback, useEffect } from 'react'
import { Platform } from 'react-native'
import { useGlobalPitchDetection } from '@/hooks/useGlobalPitchDetection'
import { useGameScreenMicrophone } from '@/hooks/useGameScreenMicrophone'
import { useAndroidPerformance } from '@/hooks/useAndroidPerformance'
import { correctFrequencyOctave, smoothFrequencyTransition, validateAndroidFrequency } from '@/utils/frequencyCorrection'
import { getIOSLevelPerformanceSettings, ANDROID_PERFORMANCE_SETTINGS } from '@/utils/androidOptimization'
import { independentUserGraph } from '@/utils/independentUserGraph'
import { frameRateOptimizer } from '@/utils/frameRateOptimizer'

interface PitchPoint {
  x: number
  y: number
  frequency: number
  timestamp: number
}

interface PitchDetectionParams {
  isRecording: boolean
  isPaused: boolean
  freqToY: (freq: number) => number
  startTimeRef: React.MutableRefObject<number>
}

// iOS-level configuration for Android - Enhanced for smoothness and accuracy
const getOptimizedConfig = () => {
  const isAndroid = Platform.OS === 'android'
  const iosLevelSettings = getIOSLevelPerformanceSettings()

  if (isAndroid) {
    // Use iOS-level settings for Android
    return {
      // Enhanced processing to match iOS
      MAX_PITCH_POINTS: 100,         // Match iOS capacity
      POINT_LIFETIME_MS: 8000,       // Match iOS duration
      STABILITY_BUFFER_SIZE: 5,      // Match iOS stability
      UPDATE_THROTTLE_MS: iosLevelSettings.audioConfig.updateInterval,

      // Enhanced audio parameters for iOS-level performance
      MIN_FREQ: iosLevelSettings.audioConfig.minFrequency,
      MAX_FREQ: iosLevelSettings.audioConfig.maxFrequency,
      THRESHOLD_DEFAULT: iosLevelSettings.audioConfig.pitchDetectionThreshold,
      THRESHOLD_NOISY: 0.5,          // Less aggressive noise filtering
      MAX_PITCH_DEV: 0.25,           // More tolerant for smooth transitions

      // Reduced smoothing for faster response like iOS
      SMOOTHING_ALPHA: 0.6,          // Less smoothing for responsiveness

      // Enable harmonics processing for better accuracy
      ENABLE_HARMONIC_DETECTION: true,
      HARMONIC_THRESHOLD: 0.25,

      // iOS-level optimizations
      ENABLE_PARALLEL_PROCESSING: iosLevelSettings.pitchDetectionOptimizations.enableParallelProcessing,
      FAST_RESPONSE_MODE: iosLevelSettings.pitchDetectionOptimizations.fastResponseMode,
      ENABLE_PREDICTIVE_SMOOTHING: iosLevelSettings.pitchDetectionOptimizations.enablePredictiveSmoothing,
    }
  }

  // iOS configuration (unchanged)
  return {
    MAX_PITCH_POINTS: 100,
    POINT_LIFETIME_MS: 8000,
    STABILITY_BUFFER_SIZE: 5,
    UPDATE_THROTTLE_MS: 16,
    MIN_FREQ: 80,
    MAX_FREQ: 6000,
    THRESHOLD_DEFAULT: 0.15,
    THRESHOLD_NOISY: 0.6,
    MAX_PITCH_DEV: 0.2,
    SMOOTHING_ALPHA: 0.7,
    ENABLE_HARMONIC_DETECTION: true,
    HARMONIC_THRESHOLD: 0.3,
  }
}

export const useOptimizedPitchDetection = ({
  isRecording,
  isPaused,
  freqToY,
  startTimeRef,
}: PitchDetectionParams) => {
  const config = getOptimizedConfig()

  const [pitch, setPitch] = useState(0)
  const [pitchPoints, setPitchPoints] = useState<PitchPoint[]>([])

  const pitchStabilityBuffer = useRef<number[]>([])
  const prevPitch = useRef<number>(0)
  const lastValidPitch = useRef<number>(0)
  const lastUpdateTime = useRef<number>(0)

  // Enhanced Android performance optimization for iOS-level smoothness
  const { throttledUpdate, shouldReduceQuality } = useAndroidPerformance({
    enableThrottling: Platform.OS === 'android' && ANDROID_PERFORMANCE_SETTINGS.throttleUpdates,
    throttleMs: config.UPDATE_THROTTLE_MS,
    prioritizeAudio: true,
  })

  const { micAccess } = useGameScreenMicrophone()

  const {
    pitch: detectedPitch,
    rms
  } = useGlobalPitchDetection({
    enabled: isRecording && !isPaused && micAccess === "granted"
  })

  // Calculate clarity from RMS for compatibility
  const clarity = rms > 0 ? Math.min(rms * 10, 1.0) : 0

  // Enhanced pitch validation - completely independent of target frequency
  const isValidPitch = useCallback((freq: number, clarityValue: number, rmsValue: number): boolean => {
    // Basic frequency validation - no target interference
    if (!validateAndroidFrequency(freq, rmsValue)) return false

    if (!freq || freq < config.MIN_FREQ || freq > config.MAX_FREQ) return false

    let threshold = config.THRESHOLD_DEFAULT
    if (rmsValue < 0.01) threshold = config.THRESHOLD_NOISY

    if (clarityValue < threshold) return false

    // Simplified deviation check - no target proximity considerations
    if (lastValidPitch.current > 0) {
      const deviation = Math.abs(freq - lastValidPitch.current) / lastValidPitch.current
      // More tolerant threshold to prevent hanging near any frequency
      if (deviation > config.MAX_PITCH_DEV * 1.5) return false // Increased tolerance
    }

    return true
  }, [config])

  // Enhanced frequency correction with previous frequency context
  const correctDetectedFrequency = useCallback((freq: number): number => {
    // Apply enhanced octave correction with previous frequency for context
    const correctedFreq = correctFrequencyOctave(
      freq,
      [config.MIN_FREQ, config.MAX_FREQ],
      lastValidPitch.current
    )

    // Additional harmonic detection if enabled
    if (config.ENABLE_HARMONIC_DETECTION) {
      // Check for common harmonic ratios (2:1, 3:1, 4:1)
      const possibleFundamentals = [correctedFreq, correctedFreq / 2, correctedFreq / 3, correctedFreq / 4]

      // Return the frequency that makes most musical sense
      for (const fundamental of possibleFundamentals) {
        if (fundamental >= config.MIN_FREQ && fundamental <= config.MAX_FREQ) {
          return fundamental
        }
      }
    }

    return correctedFreq
  }, [config])

  // Independent user graph processing - zero target interference
  const addPitchPoint = useCallback((frequency: number) => {
    const now = Date.now()
    const elapsedMs = now - startTimeRef.current
    const x = elapsedMs * (60 / 1000) // PIXELS_PER_MS
    const y = freqToY(frequency)

    // Use independent user graph processor for zero interference
    const optimizedPoints = independentUserGraph.processUserPoint(frequency, now, x, y)

    // Convert to expected format and update state
    const formattedPoints: PitchPoint[] = optimizedPoints.map(point => ({
      x: point.x,
      y: point.y,
      frequency: point.frequency,
      timestamp: point.timestamp
    }))

    setPitchPoints(formattedPoints)
  }, [freqToY, startTimeRef])

  // Ultra-fast pitch processing - minimal computation for maximum frame rate
  const processPitch = useCallback((detectedFreq: number, clarityValue: number, rmsValue: number) => {
    if (!isRecording || isPaused) {
      setPitch(0)
      return
    }

    // Skip heavy frequency correction to prevent frame drops
    let finalFreq = detectedFreq

    // Minimal validation for performance
    if (!finalFreq || finalFreq < config.MIN_FREQ || finalFreq > config.MAX_FREQ) {
      return
    }

    // Basic clarity check only
    if (clarityValue < config.THRESHOLD_DEFAULT * 0.8) { // More lenient
      return
    }

    // Minimal smoothing for performance
    if (prevPitch.current > 0) {
      const ratio = finalFreq / prevPitch.current
      // Reject only extreme jumps to prevent glitches
      if (ratio > 3 || ratio < 0.33) {
        return
      }
      // Light smoothing
      finalFreq = 0.7 * finalFreq + 0.3 * prevPitch.current
    }

    setPitch(finalFreq)
    prevPitch.current = finalFreq
    lastValidPitch.current = finalFreq

    addPitchPoint(finalFreq)
  }, [isRecording, isPaused, addPitchPoint, config])

  // Process detected pitch with iOS-level responsiveness
  useEffect(() => {
    if (detectedPitch && rms !== undefined) {
      if (Platform.OS === 'android' && ANDROID_PERFORMANCE_SETTINGS.throttleUpdates) {
        // Only use debouncing if explicitly enabled
        const debounceDelay = shouldReduceQuality() ? 15 : 5 // Reduced delays for faster response
        const timer = setTimeout(() => {
          processPitch(detectedPitch, clarity, rms)
        }, debounceDelay)
        return () => clearTimeout(timer)
      } else {
        // Immediate processing like iOS
        processPitch(detectedPitch, clarity, rms)
      }
    }
  }, [detectedPitch, clarity, rms, processPitch, shouldReduceQuality])

  // Reset when recording stops - including independent user graph
  useEffect(() => {
    if (!isRecording) {
      setPitch(0)
      setPitchPoints([])
      pitchStabilityBuffer.current = []
      prevPitch.current = 0
      lastValidPitch.current = 0
      lastUpdateTime.current = 0

      // Reset independent user graph processor
      independentUserGraph.reset()
    }
  }, [isRecording])

  return {
    pitch,
    pitchPoints,
    micAccess,
    setPitchPoints,
    isOptimized: Platform.OS === 'android',
    currentFPS: frameRateOptimizer.getCurrentFPS(),
  }
}
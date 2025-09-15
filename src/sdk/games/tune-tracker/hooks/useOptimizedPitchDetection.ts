import { useState, useRef, useCallback, useEffect } from 'react'
import { Platform } from 'react-native'
import { useGlobalPitchDetection } from '@/hooks/useGlobalPitchDetection'
import { useGameScreenMicrophone } from '@/hooks/useGameScreenMicrophone'
import { useAndroidPerformance } from '@/hooks/useAndroidPerformance'
import { correctFrequencyOctave, smoothFrequencyTransition, validateAndroidFrequency } from '@/utils/frequencyCorrection'
import { getIOSLevelPerformanceSettings, ANDROID_PERFORMANCE_SETTINGS } from '@/utils/androidOptimization'

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

  // Enhanced pitch validation with frequency correction
  const isValidPitch = useCallback((freq: number, clarityValue: number, rmsValue: number): boolean => {
    // Android-specific validation
    if (!validateAndroidFrequency(freq, rmsValue)) return false

    if (!freq || freq < config.MIN_FREQ || freq > config.MAX_FREQ) return false

    let threshold = config.THRESHOLD_DEFAULT
    if (rmsValue < 0.01) threshold = config.THRESHOLD_NOISY

    if (clarityValue < threshold) return false

    // iOS-level deviation check - more tolerant for smooth transitions
    if (lastValidPitch.current > 0) {
      const deviation = Math.abs(freq - lastValidPitch.current) / lastValidPitch.current
      // Use same tolerance as iOS for consistent performance
      if (deviation > config.MAX_PITCH_DEV) return false
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

  // Enhanced point addition with iOS-level responsiveness
  const addPitchPoint = useCallback((frequency: number) => {
    const now = Date.now()

    // Only throttle if explicitly enabled (disabled by default for iOS-level performance)
    if (Platform.OS === 'android' && ANDROID_PERFORMANCE_SETTINGS.throttleUpdates &&
        (now - lastUpdateTime.current) < config.UPDATE_THROTTLE_MS) {
      return
    }
    lastUpdateTime.current = now

    // Use immediate execution when throttling is disabled for iOS-level performance
    const executeUpdate = () => {
      const elapsedMs = now - startTimeRef.current
      const x = elapsedMs * (60 / 1000) // PIXELS_PER_MS
      const y = freqToY(frequency)

      const newPoint: PitchPoint = {
        x,
        y,
        frequency,
        timestamp: now,
      }

      setPitchPoints(prevPoints => {
        const cutoffTime = now - config.POINT_LIFETIME_MS

        // More efficient filtering for Android
        const validPoints = prevPoints.filter(point => point.timestamp > cutoffTime)
        const updatedPoints = [...validPoints, newPoint]

        // Keep only the most recent points
        if (updatedPoints.length > config.MAX_PITCH_POINTS) {
          return updatedPoints.slice(-config.MAX_PITCH_POINTS)
        }

        return updatedPoints
      })
    }

    // Execute immediately or through throttledUpdate based on settings
    if (Platform.OS === 'android' && !ANDROID_PERFORMANCE_SETTINGS.throttleUpdates) {
      executeUpdate()
    } else {
      throttledUpdate(executeUpdate)
    }
  }, [freqToY, startTimeRef, config, throttledUpdate])

  // Optimized pitch processing
  const processPitch = useCallback((detectedFreq: number, clarityValue: number, rmsValue: number) => {
    if (!isRecording || isPaused) {
      setPitch(0)
      return
    }

    // Apply frequency correction for octave issues
    const correctedFreq = correctDetectedFrequency(detectedFreq)

    if (!isValidPitch(correctedFreq, clarityValue, rmsValue)) {
      // iOS-level fallback behavior for consistent experience
      if (pitchStabilityBuffer.current.length > 2) {
        const avgBuffered = pitchStabilityBuffer.current.reduce((sum, p) => sum + p, 0) / pitchStabilityBuffer.current.length
        if (avgBuffered > 0) {
          setPitch(avgBuffered)
          addPitchPoint(avgBuffered)
        }
      }
      return
    }

    // Simplified stability buffer for Android
    pitchStabilityBuffer.current.push(correctedFreq)
    if (pitchStabilityBuffer.current.length > config.STABILITY_BUFFER_SIZE) {
      pitchStabilityBuffer.current.shift()
    }

    // iOS-level smoothing with enhanced responsiveness
    let smoothedPitch = correctedFreq
    if (prevPitch.current > 0) {
      // Use iOS-level smoothing factor for consistent behavior
      const dynamicSmoothingFactor = shouldReduceQuality() ? 0.4 : config.SMOOTHING_ALPHA
      smoothedPitch = smoothFrequencyTransition(
        prevPitch.current,
        correctedFreq,
        dynamicSmoothingFactor
      )
    } else {
      smoothedPitch = correctedFreq
    }

    // iOS-level validation: less aggressive stability checking for smoother experience
    if (prevPitch.current > 0) {
      const changeRatio = Math.abs(smoothedPitch - prevPitch.current) / prevPitch.current
      // Use same threshold as iOS for consistent behavior
      if (changeRatio > 0.6) {
        // More tolerant blending for smoother transitions
        smoothedPitch = 0.7 * prevPitch.current + 0.3 * correctedFreq
      }
    }

    setPitch(smoothedPitch)
    prevPitch.current = smoothedPitch
    lastValidPitch.current = smoothedPitch

    addPitchPoint(smoothedPitch)
  }, [isRecording, isPaused, isValidPitch, addPitchPoint, correctDetectedFrequency, config, shouldReduceQuality])

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

  // Reset when recording stops
  useEffect(() => {
    if (!isRecording) {
      setPitch(0)
      setPitchPoints([])
      pitchStabilityBuffer.current = []
      prevPitch.current = 0
      lastValidPitch.current = 0
      lastUpdateTime.current = 0
    }
  }, [isRecording])

  return {
    pitch,
    pitchPoints,
    micAccess,
    setPitchPoints,
    isOptimized: Platform.OS === 'android',
    currentFPS: shouldReduceQuality() ? '< 30' : '≥ 30',
  }
}
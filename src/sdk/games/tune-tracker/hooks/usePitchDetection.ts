import { useState, useRef, useCallback, useEffect } from 'react'
import { useGlobalPitchDetection } from '@/hooks/useGlobalPitchDetection'
import { useGameScreenMicrophone } from '@/hooks/useGameScreenMicrophone'

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

export const usePitchDetection = ({
  isRecording,
  isPaused,
  freqToY,
  startTimeRef,
}: PitchDetectionParams) => {
  const [pitch, setPitch] = useState(0)
  const [pitchPoints, setPitchPoints] = useState<PitchPoint[]>([])
  
  const pitchStabilityBuffer = useRef<number[]>([])
  const prevPitch = useRef<number>(0)
  const lastValidPitch = useRef<number>(0)

  // Noise reduction parameters
  const MIN_FREQ = 60
  const MAX_FREQ = 6000
  const MAX_PITCH_DEV = 0.2
  const THRESHOLD_DEFAULT = 0.15
  const THRESHOLD_NOISY = 0.6
  const RMS_GAP = 1.1
  const ENABLE_FILTER = true
  const MAX_PITCH_POINTS = 100
  const POINT_LIFETIME_MS = 8000
  const PIXELS_PER_MS = 60 / 1000

  const { micAccess } = useGameScreenMicrophone()
  
  const { 
    pitch: detectedPitch, 
    clarity, 
    rms 
  } = useGlobalPitchDetection({
    enabled: isRecording && !isPaused && micAccess === "granted"
  })

  const isValidPitch = useCallback((freq: number, clarityValue: number, rmsValue: number): boolean => {
    if (!freq || freq < MIN_FREQ || freq > MAX_FREQ) return false
    
    let threshold = THRESHOLD_DEFAULT
    if (rmsValue < 0.01) threshold = THRESHOLD_NOISY
    
    if (clarityValue < threshold) return false
    
    if (ENABLE_FILTER && lastValidPitch.current > 0) {
      const deviation = Math.abs(freq - lastValidPitch.current) / lastValidPitch.current
      if (deviation > MAX_PITCH_DEV) return false
    }
    
    return true
  }, [MIN_FREQ, MAX_FREQ, THRESHOLD_DEFAULT, THRESHOLD_NOISY, ENABLE_FILTER, MAX_PITCH_DEV])

  const addPitchPoint = useCallback((frequency: number) => {
    const now = Date.now()
    const elapsedMs = now - startTimeRef.current
    const x = elapsedMs * PIXELS_PER_MS
    const y = freqToY(frequency)
    
    const newPoint: PitchPoint = {
      x,
      y,
      frequency,
      timestamp: now,
    }
    
    setPitchPoints(prevPoints => {
      // Add new point and remove old ones
      const updatedPoints = [...prevPoints, newPoint]
      const cutoffTime = now - POINT_LIFETIME_MS
      
      const filteredPoints = updatedPoints
        .filter(point => point.timestamp > cutoffTime)
        .slice(-MAX_PITCH_POINTS)
      
      return filteredPoints
    })
  }, [freqToY, startTimeRef, PIXELS_PER_MS, POINT_LIFETIME_MS, MAX_PITCH_POINTS])

  const processPitch = useCallback((detectedFreq: number, clarityValue: number, rmsValue: number) => {
    if (!isRecording || isPaused) {
      setPitch(0)
      return
    }

    if (!isValidPitch(detectedFreq, clarityValue, rmsValue)) {
      // Use stability buffer for smoother transitions
      if (pitchStabilityBuffer.current.length > 3) {
        const avgBuffered = pitchStabilityBuffer.current.reduce((sum, p) => sum + p, 0) / pitchStabilityBuffer.current.length
        if (avgBuffered > 0) {
          setPitch(avgBuffered)
          addPitchPoint(avgBuffered)
        }
      }
      return
    }

    // Add to stability buffer
    pitchStabilityBuffer.current.push(detectedFreq)
    if (pitchStabilityBuffer.current.length > 5) {
      pitchStabilityBuffer.current.shift()
    }

    // Smooth pitch changes
    let smoothedPitch = detectedFreq
    if (prevPitch.current > 0) {
      const alpha = 0.7 // Smoothing factor
      smoothedPitch = alpha * detectedFreq + (1 - alpha) * prevPitch.current
    }

    setPitch(smoothedPitch)
    prevPitch.current = smoothedPitch
    lastValidPitch.current = smoothedPitch
    
    addPitchPoint(smoothedPitch)
  }, [isRecording, isPaused, isValidPitch, addPitchPoint])

  // Process detected pitch
  useEffect(() => {
    if (detectedPitch && clarity !== undefined && rms !== undefined) {
      processPitch(detectedPitch, clarity, rms)
    }
  }, [detectedPitch, clarity, rms, processPitch])

  // Reset when recording stops
  useEffect(() => {
    if (!isRecording) {
      setPitch(0)
      setPitchPoints([])
      pitchStabilityBuffer.current = []
      prevPitch.current = 0
      lastValidPitch.current = 0
    }
  }, [isRecording])

  return {
    pitch,
    pitchPoints,
    micAccess,
    setPitchPoints,
  }
}
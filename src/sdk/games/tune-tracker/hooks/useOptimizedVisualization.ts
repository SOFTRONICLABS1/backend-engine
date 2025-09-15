import { useMemo, useCallback } from 'react'
import { Platform, useWindowDimensions } from 'react-native'
import { useAndroidPerformance } from '@/hooks/useAndroidPerformance'
import { NOTE_FREQUENCIES } from '@/utils/noteParser'

interface PitchPoint {
  x: number
  y: number
  frequency: number
  timestamp: number
}

// Define piano notes for the keyboard display
const PIANO_NOTES = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6']

// Filter to reasonable vocal range based on performance
const getVisiblePianoNotes = (isAndroid: boolean) => {
  if (isAndroid) {
    // Reduced range for Android performance
    return ['C3', 'E3', 'G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6']
  }
  return PIANO_NOTES
}

export const useOptimizedVisualization = () => {
  const { width, height } = useWindowDimensions()
  const { getOptimizedValue, shouldReduceQuality } = useAndroidPerformance()

  // Adaptive quality settings
  const graphWidth = getOptimizedValue(width * 0.75, width * 0.6)
  const graphHeight = getOptimizedValue(height * 0.6, height * 0.4)

  // Frequency range optimized for Android
  const minFreq = Platform.OS === 'android' ? 200 : 100
  const maxFreq = Platform.OS === 'android' ? 1000 : 2000

  // Convert frequency to Y coordinate
  const freqToY = useCallback((freq: number): number => {
    if (freq <= 0) return graphHeight

    const logMinFreq = Math.log10(minFreq)
    const logMaxFreq = Math.log10(maxFreq)
    const logFreq = Math.log10(Math.max(freq, minFreq))

    const normalizedPos = (logFreq - logMinFreq) / (logMaxFreq - logMinFreq)
    return graphHeight - (normalizedPos * graphHeight)
  }, [graphHeight, minFreq, maxFreq])

  // Optimized piano key rendering with dynamic note selection
  const pianoKeys = useMemo(() => {
    const visibleNotes = getVisiblePianoNotes(Platform.OS === 'android')
    const keyHeight = graphHeight / visibleNotes.length

    return visibleNotes.map((note) => {
      const frequency = NOTE_FREQUENCIES[note]
      const y = freqToY(frequency)

      return {
        note,
        frequency,
        y,
        keyHeight,
        isWhiteKey: !note.includes('#'),
      }
    })
  }, [freqToY, graphHeight])

  // Viewport management
  const calculateViewportCenter = useCallback((pitchPoints: PitchPoint[]) => {
    if (pitchPoints.length === 0) return 440 // Default to A4

    // Get recent points for viewport calculation
    const recentPoints = pitchPoints.slice(-10)
    const avgFreq = recentPoints.reduce((sum, point) => sum + point.frequency, 0) / recentPoints.length

    return avgFreq
  }, [])

  // Optimized grid line calculation
  const getGridLines = useCallback(() => {
    const visibleNotes = getVisiblePianoNotes(Platform.OS === 'android')
    if (shouldReduceQuality()) {
      // Fewer grid lines on low-performance devices
      return visibleNotes.filter((_, index) => index % 2 === 0)
    }
    return visibleNotes
  }, [shouldReduceQuality])

  // Optimized path calculation for pitch visualization
  const calculateOptimizedPath = useCallback((pitchPoints: PitchPoint[]) => {
    if (pitchPoints.length === 0) return null

    // Reduce points for Android to improve performance
    let points = pitchPoints
    if (Platform.OS === 'android' && shouldReduceQuality()) {
      // Sample every nth point for smoother performance
      const step = Math.max(1, Math.floor(pitchPoints.length / 25))
      points = pitchPoints.filter((_, index) => index % step === 0)
    }

    return points
  }, [shouldReduceQuality])

  return {
    graphWidth,
    graphHeight,
    freqToY,
    pianoKeys,
    calculateViewportCenter,
    getGridLines,
    calculateOptimizedPath,
    PIANO_NOTES: getVisiblePianoNotes(Platform.OS === 'android'),
    NOTE_FREQUENCIES,
    minFreq,
    maxFreq,
    isOptimized: Platform.OS === 'android',
    qualityLevel: shouldReduceQuality() ? 'low' : 'high',
  }
}
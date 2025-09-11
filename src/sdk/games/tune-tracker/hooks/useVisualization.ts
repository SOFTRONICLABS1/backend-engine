import { useState, useCallback, useMemo } from 'react'
import { useWindowDimensions } from 'react-native'
import { NOTE_FREQUENCIES } from '@/utils/noteParser'

const PIANO_NOTES = [
  "C6","B5","A#5","A5","G#5","G5","F#5","F5","E5","D#5","D5","C#5","C5",
  "B4","A#4","A4","G#4","G4","F#4","F4","E4","D#4","D4","C#4","C4",
  "B3","A#3","A3","G#3","G3","F#3","F3","E3","D#3","D3","C#3","C3",
  "B2","A#2","A2","G#2","G2","F#2","F2","E2","D#2","D2","C#2","C2"
]

export const useVisualization = () => {
  const { width, height } = useWindowDimensions()
  const [viewportCenterFreq, setViewportCenterFreq] = useState(440)
  const [targetCenterFreq, setTargetCenterFreq] = useState(440)

  // Graph dimensions
  const graphHeight = height - 140 // Accounting for top bar and controls
  const graphWidth = width - 80 // Accounting for piano keys

  const NOTE_FREQUENCIES_MAP = NOTE_FREQUENCIES

  const calculateViewportCenter = useCallback(() => {
    const frequencies = Object.values(NOTE_FREQUENCIES_MAP).filter(freq => 
      typeof freq === 'number' && freq >= 100 && freq <= 1000
    ) as number[]
    
    if (frequencies.length === 0) return 440
    
    // Use geometric mean for better frequency distribution
    const logSum = frequencies.reduce((sum, freq) => sum + Math.log(freq), 0)
    const geometricMean = Math.exp(logSum / frequencies.length)
    
    return Math.round(geometricMean)
  }, [NOTE_FREQUENCIES_MAP])

  const freqToY = useCallback((freq: number) => {
    if (!freq || freq <= 0) return graphHeight / 2
    
    const octaveSpan = 4 // Show 4 octaves
    const minFreq = viewportCenterFreq / Math.pow(2, octaveSpan / 2)
    const maxFreq = viewportCenterFreq * Math.pow(2, octaveSpan / 2)
    
    // Logarithmic scale for better note spacing
    const logMin = Math.log2(minFreq)
    const logMax = Math.log2(maxFreq)
    const logFreq = Math.log2(freq)
    
    const normalizedPosition = (logFreq - logMin) / (logMax - logMin)
    
    // Invert Y axis (higher frequencies at top)
    return graphHeight * (1 - normalizedPosition)
  }, [viewportCenterFreq, graphHeight])

  const pitchToFrequency = useCallback((pitch: string) => 
    NOTE_FREQUENCIES_MAP[pitch] || 440, [NOTE_FREQUENCIES_MAP])

  const pianoKeys = useMemo(() => {
    return PIANO_NOTES.map((note, index) => {
      const freq = pitchToFrequency(note)
      return {
        note,
        frequency: freq,
        index,
        y: freqToY(freq),
        isBlackKey: note.includes('#'),
      }
    })
  }, [pitchToFrequency, freqToY])

  return {
    // Dimensions
    graphHeight,
    graphWidth,
    
    // State
    viewportCenterFreq,
    targetCenterFreq,
    
    // Setters
    setViewportCenterFreq,
    setTargetCenterFreq,
    
    // Computed values
    pianoKeys,
    
    // Functions
    calculateViewportCenter,
    freqToY,
    pitchToFrequency,
    
    // Constants
    PIANO_NOTES,
    NOTE_FREQUENCIES_MAP,
  }
}
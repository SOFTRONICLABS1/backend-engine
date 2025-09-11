import { useState, useRef, useCallback, useEffect } from 'react'
import { Audio } from 'expo-av'
import { GuitarHarmonics } from '@/utils/GuitarHarmonics'
import { encode as btoa } from 'base-64'

interface RecordingControlsParams {
  calculateViewportCenter: () => number
  setViewportCenterFreq: (freq: number) => void
  setTargetCenterFreq: (freq: number) => void
  setPitchPoints: (points: any[] | ((prev: any[]) => any[])) => void
}

export const useRecordingControls = ({
  calculateViewportCenter,
  setViewportCenterFreq,
  setTargetCenterFreq,
  setPitchPoints,
}: RecordingControlsParams) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [activeNoteIndex, setActiveNoteIndex] = useState(-1)
  const [targetSegments, setTargetSegments] = useState<any[]>([])

  const startTimeRef = useRef<number>(Date.now())
  const animationFrameRef = useRef<number | null>(null)
  const harmonicsSetRef = useRef<Set<string>>(new Set())
  const guitarHarmonicsRef = useRef<GuitarHarmonics | null>(null)
  const pitchStabilityBuffer = useRef<number[]>([])
  const appendControllerRef = useRef<{ nextStartMs: number | null, running: boolean }>({ 
    nextStartMs: null, 
    running: false 
  })

  // Initialize GuitarHarmonics
  useEffect(() => {
    if (!guitarHarmonicsRef.current) {
      guitarHarmonicsRef.current = new GuitarHarmonics()
    }
  }, [])

  // WAV tone generator for fallback audio
  const generateToneWavDataUri = useCallback((frequency: number, durationMs: number, sampleRate = 44100, volume = 0.5) => {
    const durationSeconds = Math.max(0.03, durationMs / 1000)
    const totalSamples = Math.floor(sampleRate * durationSeconds)
    const buffer = new ArrayBuffer(44 + totalSamples * 2)
    const view = new DataView(buffer)
    let offset = 0

    const writeString = (s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i))
    }
    const writeUint32 = (value: number) => { view.setUint32(offset, value, true); offset += 4 }
    const writeUint16 = (value: number) => { view.setUint16(offset, value, true); offset += 2 }

    // WAV header
    writeString('RIFF')
    writeUint32(36 + totalSamples * 2)
    writeString('WAVE')
    writeString('fmt ')
    writeUint32(16)
    writeUint16(1)
    writeUint16(1)
    writeUint32(sampleRate)
    writeUint32(sampleRate * 2)
    writeUint16(2)
    writeUint16(16)
    writeString('data')
    writeUint32(totalSamples * 2)

    // Generate tone
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate
      const sample = Math.sin(2 * Math.PI * frequency * t) * volume
      const envelope = Math.exp(-t * 2) // Decay envelope
      const value = Math.round(sample * envelope * 32767)
      view.setInt16(offset, value, true)
      offset += 2
    }

    const bytes = new Uint8Array(buffer)
    const base64 = btoa(String.fromCharCode(...bytes))
    return `data:audio/wav;base64,${base64}`
  }, [])

  const playDataUriWithExpo = useCallback(async (dataUri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: dataUri },
        { shouldPlay: true, volume: 0.3 }
      )
      
      setTimeout(async () => {
        try {
          await sound.unloadAsync()
        } catch (error) {
          console.warn('Error unloading sound:', error)
        }
      }, 1000)
    } catch (error) {
      console.warn('Error playing audio:', error)
    }
  }, [])

  const playGuitarHarmonic = useCallback((pitchOrFreq: string | number, duration = 300) => {
    let freq: number
    if (typeof pitchOrFreq === 'number') freq = pitchOrFreq
    else freq = 440 // Default fallback

    try {
      if (guitarHarmonicsRef.current && typeof guitarHarmonicsRef.current.playNote === 'function') {
        guitarHarmonicsRef.current.playNote(freq, duration / 1000, 0.3)
      } else {
        // Fallback to generated tone
        const dataUri = generateToneWavDataUri(freq, duration, 44100, 0.3)
        playDataUriWithExpo(dataUri)
      }
    } catch (error) {
      console.warn('Error playing guitar harmonic:', error)
      // Final fallback
      const dataUri = generateToneWavDataUri(freq, duration, 44100, 0.3)
      playDataUriWithExpo(dataUri)
    }
  }, [generateToneWavDataUri, playDataUriWithExpo])

  const handlePlayStopToggle = useCallback(() => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      setIsPaused(false)
      setPitchPoints([])
      setActiveNoteIndex(-1)
      setTargetSegments([])
      appendControllerRef.current.running = false
      appendControllerRef.current.nextStartMs = null
      harmonicsSetRef.current.clear()
      const centerFreq = calculateViewportCenter()
      setViewportCenterFreq(centerFreq)
      setTargetCenterFreq(centerFreq)
      pitchStabilityBuffer.current = []
    } else {
      // Start recording
      setIsRecording(true)
      setIsPaused(false)
      setPitchPoints([])
      startTimeRef.current = Date.now()
      const centerFreq = calculateViewportCenter()
      setViewportCenterFreq(centerFreq)
      setTargetCenterFreq(centerFreq)
      pitchStabilityBuffer.current = []
      harmonicsSetRef.current.clear()
    }
  }, [
    isRecording, 
    calculateViewportCenter, 
    setViewportCenterFreq, 
    setTargetCenterFreq, 
    setPitchPoints
  ])

  // Animation loop cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Reset when component unmounts
  useEffect(() => {
    return () => {
      setIsRecording(false)
      setIsPaused(false)
      harmonicsSetRef.current.clear()
      pitchStabilityBuffer.current = []
      if (appendControllerRef.current) {
        appendControllerRef.current.running = false
        appendControllerRef.current.nextStartMs = null
      }
    }
  }, [])

  return {
    // State
    isRecording,
    isPaused,
    activeNoteIndex,
    targetSegments,
    
    // Setters
    setIsRecording,
    setIsPaused,
    setActiveNoteIndex,
    setTargetSegments,
    
    // Actions
    handlePlayStopToggle,
    playGuitarHarmonic,
    
    // Refs
    startTimeRef,
    animationFrameRef,
    harmonicsSetRef,
    guitarHarmonicsRef,
    appendControllerRef,
  }
}
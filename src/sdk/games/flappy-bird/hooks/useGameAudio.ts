import { useState, useRef, useCallback, useEffect } from 'react'
import { Audio } from 'expo-av'

interface Note {
  name: string
  frequency: number
  duration: number
  key_signature: string
  time_signature: string
}

interface GameAudioParams {
  notes: Note[]
  currentNoteIndex: number
  setCurrentNoteIndex: (index: number | ((prev: number) => number)) => void
  setCurrentNoteAccuracy: (accuracy: number | ((prev: number) => number)) => void
  setNoteAccuracies: (accuracies: number[] | ((prev: number[]) => number[])) => void
  setCycleAccuracies: (accuracies: number[] | ((prev: number[]) => number[])) => void
  setCycle: (cycle: number | ((prev: number) => number)) => void
  jump: () => void
}

export const useGameAudio = ({
  notes,
  currentNoteIndex,
  setCurrentNoteIndex,
  setCurrentNoteAccuracy,
  setNoteAccuracies,
  setCycleAccuracies,
  setCycle,
  jump,
}: GameAudioParams) => {
  const [currentFrequency, setCurrentFrequency] = useState<number | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUri, setRecordingUri] = useState<string | null>(null)
  
  // Audio refs
  const recordingRef = useRef<Audio.Recording | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)
  const noteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const accuracyHistoryRef = useRef<number[]>([])
  const noteStartTimeRef = useRef<number | null>(null)

  // Note frequency mapping
  const noteFrequencyMap: Record<string, number> = {
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
    'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
    'A#4': 466.16, 'B4': 493.88, 'C5': 523.25, 'C#5': 554.37, 'D5': 587.33,
    'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
    'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77
  }

  const getCurrentNote = useCallback(() => {
    if (currentNoteIndex >= notes.length) return null
    return notes[currentNoteIndex]
  }, [notes, currentNoteIndex])

  const getTargetFrequency = useCallback(() => {
    const currentNote = getCurrentNote()
    if (!currentNote) return null
    return noteFrequencyMap[currentNote.name] || currentNote.frequency
  }, [getCurrentNote, noteFrequencyMap])

  const calculatePitchAccuracy = useCallback((detectedFreq: number, targetFreq: number): number => {
    if (!targetFreq || !detectedFreq) return 0
    
    const centsDifference = Math.abs(1200 * Math.log2(detectedFreq / targetFreq))
    const maxCents = 50 // Within 50 cents is considered perfect
    
    if (centsDifference <= maxCents) {
      return Math.max(0, 100 - (centsDifference / maxCents) * 100)
    }
    
    return 0
  }, [])

  const handlePitchDetected = useCallback((frequency: number) => {
    setCurrentFrequency(frequency)
    
    const targetFreq = getTargetFrequency()
    if (!targetFreq) return
    
    const accuracy = calculatePitchAccuracy(frequency, targetFreq)
    setCurrentNoteAccuracy(accuracy)
    
    // Track accuracy history for this note
    accuracyHistoryRef.current.push(accuracy)
    
    // Jump if accuracy is high enough (above 70%)
    if (accuracy > 70) {
      jump()
    }
  }, [getTargetFrequency, calculatePitchAccuracy, setCurrentNoteAccuracy, jump])

  const advanceToNextNote = useCallback(() => {
    if (accuracyHistoryRef.current.length > 0) {
      const avgAccuracy = accuracyHistoryRef.current.reduce((sum, acc) => sum + acc, 0) / accuracyHistoryRef.current.length
      setNoteAccuracies(prev => [...prev, avgAccuracy])
    }
    
    accuracyHistoryRef.current = []
    setCurrentNoteAccuracy(0)
    
    setCurrentNoteIndex(prev => {
      const newIndex = prev + 1
      
      // Check if we completed a cycle
      if (newIndex >= notes.length) {
        setCycle(prevCycle => {
          const newCycle = prevCycle + 1
          return newCycle
        })
        
        // Calculate cycle accuracy
        setNoteAccuracies(prevAccuracies => {
          if (prevAccuracies.length > 0) {
            const cycleAccuracy = prevAccuracies.reduce((sum, acc) => sum + acc, 0) / prevAccuracies.length
            setCycleAccuracies(prevCycleAccuracies => [...prevCycleAccuracies, cycleAccuracy])
          }
          return []
        })
        
        return 0 // Reset to first note
      }
      
      return newIndex
    })
  }, [setNoteAccuracies, setCurrentNoteAccuracy, setCurrentNoteIndex, setCycle, setCycleAccuracies, notes.length])

  const startNoteTimer = useCallback(() => {
    const currentNote = getCurrentNote()
    if (!currentNote) return
    
    noteStartTimeRef.current = Date.now()
    
    if (noteTimeoutRef.current) {
      clearTimeout(noteTimeoutRef.current)
    }
    
    noteTimeoutRef.current = setTimeout(() => {
      advanceToNextNote()
    }, currentNote.duration)
  }, [getCurrentNote, advanceToNextNote])

  const playCurrentNote = useCallback(async () => {
    const currentNote = getCurrentNote()
    if (!currentNote) return
    
    try {
      // Stop any currently playing sound
      if (soundRef.current) {
        await soundRef.current.stopAsync()
        await soundRef.current.unloadAsync()
        soundRef.current = null
      }
      
      // Play the note (you would need to implement audio synthesis or use pre-recorded notes)
      // This is a placeholder for the actual note playing logic
      
      startNoteTimer()
    } catch (error) {
      console.error('Error playing note:', error)
    }
  }, [getCurrentNote, startNoteTimer])

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync()
      if (permission.status !== 'granted') return
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      
      recordingRef.current = recording
      setIsRecording(true)
      
      playCurrentNote()
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }, [playCurrentNote])

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return
    
    try {
      setIsRecording(false)
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      setRecordingUri(uri)
      recordingRef.current = null
      
      if (noteTimeoutRef.current) {
        clearTimeout(noteTimeoutRef.current)
        noteTimeoutRef.current = null
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }, [])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync()
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync()
      }
      if (noteTimeoutRef.current) {
        clearTimeout(noteTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    currentFrequency,
    isRecording,
    recordingUri,
    
    // Computed values
    currentNote: getCurrentNote(),
    targetFrequency: getTargetFrequency(),
    
    // Actions
    handlePitchDetected,
    startRecording,
    stopRecording,
    advanceToNextNote,
    playCurrentNote,
    
    // Refs
    noteTimeoutRef,
    accuracyHistoryRef,
    noteStartTimeRef,
  }
}
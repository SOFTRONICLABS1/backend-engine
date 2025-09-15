import React, { useCallback, useMemo, useState, useRef } from "react"
import { View, StyleSheet, Platform, Text } from "react-native"
import { useNavigation } from "@react-navigation/native"

import { handleGameExit } from "@/utils/gameNavigation"
import RequireMicAccess from "@/components/RequireMicAccess"
import { AndroidOptimizedGame } from "@/components/AndroidOptimizedGame"
import { NonBlockingGraphRenderer } from "@/components/NonBlockingGraphRenderer"
import { targetWaveSmoothing } from "@/utils/targetWaveSmoothing"

// Import optimized components
import { PianoKeyboard, FrequencyDisplay, TopBar, PlayStopButton } from './components'

// Import optimized hooks
import { useOptimizedPitchDetection } from './hooks/useOptimizedPitchDetection'
import { useOptimizedVisualization } from './hooks/useOptimizedVisualization'
import { useRecordingControls } from './hooks'

export const TuneTrackerAndroidFixed = ({ notes }: { notes?: any }) => {
  const navigation = useNavigation()

  // Initialize optimized hooks
  const visualization = useOptimizedVisualization()
  const {
    graphHeight,
    graphWidth,
    freqToY,
    calculateViewportCenter,
    getGridLines,
    PIANO_NOTES,
    NOTE_FREQUENCIES,
    isOptimized,
    qualityLevel,
  } = visualization

  const recordingControls = useRecordingControls({
    calculateViewportCenter,
    setViewportCenterFreq: () => {}, // Simplified for performance
    setTargetCenterFreq: () => {},
    setPitchPoints: () => {}, // Will be set by pitch detection
  })

  const {
    isRecording,
    isPaused,
    activeNoteIndex,
    handlePlayStopToggle,
    startTimeRef,
  } = recordingControls

  const pitchDetection = useOptimizedPitchDetection({
    isRecording,
    isPaused,
    freqToY,
    startTimeRef,
  })

  const { pitch, pitchPoints, micAccess, setPitchPoints, currentFPS } = pitchDetection

  // Enhanced target notes processing for smooth center line transitions
  const targetPoints = useMemo(() => {
    if (!notes || !Array.isArray(notes) || !isRecording) return []

    try {
      const now = Date.now()
      const elapsedMs = now - startTimeRef.current
      const PIXELS_PER_MS = 60 / 1000

      // Enhanced note processing with smooth transitions
      const enhancedPoints: any[] = []

      notes
        .filter(note => {
          // Show notes that are currently active or upcoming with longer buffer
          const noteStartTime = note.startTime || 0
          const noteDuration = note.duration || 1000
          return noteStartTime <= elapsedMs + 3000 && noteStartTime + noteDuration >= elapsedMs - 1500
        })
        .forEach((note, index) => {
          const noteStartTime = note.startTime || index * 1000
          const noteDuration = note.duration || 1000
          const noteEndTime = noteStartTime + noteDuration
          const frequency = NOTE_FREQUENCIES[note.pitch] || 440
          const y = freqToY(frequency)

          // Generate multiple points for smooth note transitions
          const pointCount = Math.max(3, Math.min(10, Math.floor(noteDuration / 100))) // 3-10 points per note

          for (let i = 0; i <= pointCount; i++) {
            const progress = i / pointCount
            const currentTime = noteStartTime + (noteDuration * progress)
            const x = (currentTime - elapsedMs) * PIXELS_PER_MS

            // Enhanced smoothing for note endings near center line
            let adjustedY = y
            if (Math.abs(y - centerLineY) < 10) {
              // Smooth approach and departure from center line
              if (progress > 0.8) {
                // Note ending - smooth fade out
                const fadeProgress = (progress - 0.8) / 0.2
                const fadeOffset = Math.sin(fadeProgress * Math.PI) * 2 // Gentle sine wave
                adjustedY = y + fadeOffset
              } else if (progress < 0.2) {
                // Note beginning - smooth fade in
                const fadeProgress = progress / 0.2
                const fadeOffset = Math.sin(fadeProgress * Math.PI) * 2
                adjustedY = y + fadeOffset
              }
            }

            enhancedPoints.push({
              x: Math.max(0, Math.min(graphWidth, x)),
              y: adjustedY,
              frequency,
              timestamp: now,
              noteId: `${note.pitch}-${index}`,
              progress,
            })
          }
        })

      // Filter only visible points and sort by x position for smooth rendering
      const visiblePoints = enhancedPoints
        .filter(point => point.x >= -100 && point.x <= graphWidth + 100)
        .sort((a, b) => a.x - b.x) // Ensure proper order for smooth path

      // Apply specialized target wave smoothing for Android center line interactions
      return Platform.OS === 'android'
        ? targetWaveSmoothing.smoothTargetPoints(visiblePoints, centerLineY, graphWidth)
        : visiblePoints
    } catch (error) {
      console.warn('Error processing target points:', error)
      return []
    }
  }, [notes, isRecording, startTimeRef, NOTE_FREQUENCIES, freqToY, graphWidth, centerLineY])

  // Update recording controls with setPitchPoints
  React.useEffect(() => {
    recordingControls.setPitchPoints = setPitchPoints
  }, [setPitchPoints])

  // Get current target information
  const getCurrentTargetInfo = useCallback(() => {
    if (!notes || !Array.isArray(notes) || targetPoints.length === 0) return null

    const now = Date.now()
    const elapsedMs = now - startTimeRef.current

    // Find the currently active target note
    const activeTarget = notes.find(note => {
      const noteStartTime = note.startTime || 0
      const noteDuration = note.duration || 1000
      return noteStartTime <= elapsedMs && noteStartTime + noteDuration >= elapsedMs
    })

    if (activeTarget) {
      return {
        note: activeTarget.pitch,
        frequency: NOTE_FREQUENCIES[activeTarget.pitch] || 440,
        isActive: true
      }
    }

    return null
  }, [notes, targetPoints, startTimeRef, NOTE_FREQUENCIES])

  // Calculate center line position for target wave optimization
  const centerLineY = useMemo(() => {
    return graphHeight / 2 // Middle of the graph
  }, [graphHeight])

  // Optimized grid lines with center line handling
  const gridLines = useMemo(() => {
    const gridNotes = getGridLines()
    return gridNotes.map(note => ({
      y: freqToY(NOTE_FREQUENCIES[note] || 440),
      note
    }))
  }, [getGridLines, freqToY, NOTE_FREQUENCIES])

  // Handle back navigation
  const handleBackPress = useCallback(() => {
    handleGameExit(navigation as any)
  }, [navigation])

  // Performance monitoring for debug
  const [showPerformanceInfo] = useState(__DEV__ && Platform.OS === 'android')

  // Microphone access check
  if (micAccess === "denied") return <RequireMicAccess />
  if (micAccess === "pending" || micAccess === "requesting") return null

  return (
    <AndroidOptimizedGame gameType="audio">
      <View style={styles.container}>
        <TopBar onBack={handleBackPress} />

        {showPerformanceInfo && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              Optimized: {isOptimized ? 'Yes' : 'No'} | Quality: {qualityLevel} | FPS: {currentFPS}
            </Text>
            <Text style={styles.debugText}>
              User Points: {pitchPoints.length} | Target Points: {targetPoints.length}
            </Text>
            <Text style={styles.debugText}>
              Pitch: {pitch.toFixed(1)} Hz | Current Target: {getCurrentTargetInfo()?.note || 'None'}
            </Text>
          </View>
        )}

        <View style={styles.mainContent}>
          <PianoKeyboard
            pianoNotes={PIANO_NOTES}
            freqToY={freqToY}
            graphHeight={graphHeight}
            noteFrequencies={NOTE_FREQUENCIES}
            activeNoteIndex={activeNoteIndex}
            isRecording={isRecording}
            isPaused={isPaused}
          />

          <View style={styles.graphContainer}>
            <NonBlockingGraphRenderer
              pitchPoints={pitchPoints}
              targetPoints={targetPoints}
              gridLines={gridLines}
              width={graphWidth}
              height={graphHeight}
              backgroundColor="rgba(10,10,10,0.8)"
              centerLineY={centerLineY}
            />

            <FrequencyDisplay
              pitch={pitch}
              isRecording={isRecording}
              isPaused={isPaused}
              getCurrentTargetInfo={getCurrentTargetInfo}
              noteFrequencies={NOTE_FREQUENCIES}
            />
          </View>
        </View>

        <View style={styles.controls}>
          <PlayStopButton
            isRecording={isRecording}
            onPress={handlePlayStopToggle}
          />
        </View>
      </View>
    </AndroidOptimizedGame>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  debugInfo: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 1000,
    maxWidth: 300,
  },
  debugText: {
    color: 'white',
    fontSize: 9,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  graphContainer: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 30, 0.8)',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  controls: {
    padding: 20,
    alignItems: 'center',
  },
})
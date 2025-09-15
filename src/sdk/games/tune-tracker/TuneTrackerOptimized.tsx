import React, { useCallback, useMemo, useState } from "react"
import { View, StyleSheet, Platform, Text } from "react-native"
import { useNavigation } from "@react-navigation/native"

import { handleGameExit } from "@/utils/gameNavigation"
import RequireMicAccess from "@/components/RequireMicAccess"
import { AndroidOptimizedGame } from "@/components/AndroidOptimizedGame"
import { OptimizedGraphRenderer } from "@/components/OptimizedGraphRenderer"

// Import optimized components
import { PianoKeyboard, FrequencyDisplay, TopBar, PlayStopButton } from './components'

// Import optimized hooks
import { useOptimizedPitchDetection } from './hooks/useOptimizedPitchDetection'
import { useOptimizedVisualization } from './hooks/useOptimizedVisualization'
import { useRecordingControls } from './hooks'

export const TuneTrackerOptimized = ({ notes }: { notes?: any }) => {
  const navigation = useNavigation()

  // Initialize optimized hooks
  const visualization = useOptimizedVisualization()
  const {
    graphHeight,
    graphWidth,
    freqToY,
    pianoKeys,
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

  // Update recording controls with setPitchPoints
  React.useEffect(() => {
    recordingControls.setPitchPoints = setPitchPoints
  }, [setPitchPoints])

  // Get current target information (simplified)
  const getCurrentTargetInfo = useCallback(() => {
    return null // Simplified for performance
  }, [])

  // Optimized grid lines
  const gridLines = useMemo(() => {
    const gridNotes = getGridLines()
    return gridNotes.map(note => ({
      y: freqToY(NOTE_FREQUENCIES[note] || 440),
      note
    }))
  }, [getGridLines, freqToY, NOTE_FREQUENCIES])

  // Handle back navigation
  const handleBackPress = useCallback(() => {
    handleGameExit(navigation as any, { stepsBack: 1 })
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
              Optimized: {isOptimized ? 'Yes' : 'No'} |
              Quality: {qualityLevel} |
              FPS: {currentFPS} |
              Points: {pitchPoints.length}
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
            <OptimizedGraphRenderer
              pitchPoints={pitchPoints}
              gridLines={gridLines}
              width={graphWidth}
              height={graphHeight}
              backgroundColor="rgba(10,10,10,0.8)"
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
            isPaused={isPaused}
            onToggle={handlePlayStopToggle}
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 5,
    borderRadius: 3,
    zIndex: 1000,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'monospace',
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
  },
  controls: {
    padding: 20,
    alignItems: 'center',
  },
})
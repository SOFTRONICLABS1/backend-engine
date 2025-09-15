import React, { useCallback, useMemo } from "react"
import { View, StyleSheet } from "react-native"
import { Canvas, Path, Skia, vec, Line, Fill } from "@shopify/react-native-skia"
import { useNavigation } from "@react-navigation/native"

import { handleGameExit } from "@/utils/gameNavigation"
import RequireMicAccess from "@/components/RequireMicAccess"

// Import modular components
import { PianoKeyboard, FrequencyDisplay, TopBar, PlayStopButton } from './components'

// Import custom hooks
import { usePitchDetection, useVisualization, useRecordingControls } from './hooks'

export const TuneTrackerGame = ({ notes }: { notes?: any }) => {
  const navigation = useNavigation()

  // Initialize hooks
  const visualization = useVisualization()
  const {
    graphHeight,
    graphWidth,
    freqToY,
    pianoKeys,
    calculateViewportCenter,
    setViewportCenterFreq,
    setTargetCenterFreq,
    PIANO_NOTES,
    NOTE_FREQUENCIES_MAP,
  } = visualization

  const recordingControls = useRecordingControls({
    calculateViewportCenter,
    setViewportCenterFreq,
    setTargetCenterFreq,
    setPitchPoints: () => {}, // Will be set by pitch detection
  })

  const {
    isRecording,
    isPaused,
    activeNoteIndex,
    handlePlayStopToggle,
    startTimeRef,
  } = recordingControls

  const pitchDetection = usePitchDetection({
    isRecording,
    isPaused,
    freqToY,
    startTimeRef,
  })

  const { pitch, pitchPoints, micAccess, setPitchPoints } = pitchDetection

  // Update recording controls with setPitchPoints
  React.useEffect(() => {
    recordingControls.setPitchPoints = setPitchPoints
  }, [setPitchPoints])

  // Get current target information (simplified version)
  const getCurrentTargetInfo = useCallback(() => {
    // This would be more complex in a real implementation
    // For now, return null to show closest note functionality
    return null
  }, [])

  // Render the frequency graph using Skia Canvas
  const renderGraph = useMemo(() => {
    if (pitchPoints.length === 0) return null

    // Create path for pitch points
    const path = Skia.Path.Make()
    
    pitchPoints.forEach((point, index) => {
      if (index === 0) {
        path.moveTo(point.x, point.y)
      } else {
        path.lineTo(point.x, point.y)
      }
    })

    return (
      <Canvas style={{ flex: 1 }}>
        {/* Grid lines for reference */}
        {PIANO_NOTES.map((note, index) => {
          const freq = NOTE_FREQUENCIES_MAP[note]
          const y = freq ? freqToY(freq as number) : 0
          return (
            <Line
              key={`grid-${note}-${index}`}
              p1={vec(0, y)}
              p2={vec(graphWidth, y)}
              color="rgba(255,255,255,0.1)"
              strokeWidth={0.5}
            />
          )
        })}

        {/* Pitch visualization path */}
        <Path
          path={path}
          style="stroke"
          strokeWidth={2}
          color="#00ff00"
        />

        {/* Fill background */}
        <Fill color="rgba(10,10,10,0.8)" />
      </Canvas>
    )
  }, [pitchPoints, PIANO_NOTES, NOTE_FREQUENCIES_MAP, freqToY, graphWidth])

  // Handle back navigation
  const handleBackPress = useCallback(() => {
    handleGameExit(navigation as any, { stepsBack: 1 })
  }, [navigation])

  // Microphone access check
  if (micAccess === "denied") return <RequireMicAccess />
  if (micAccess === "pending" || micAccess === "requesting") return null

  return (
    <View style={styles.container}>
      <TopBar onBack={handleBackPress} />

      <View style={styles.mainContent}>
        <PianoKeyboard
          pianoNotes={PIANO_NOTES}
          freqToY={freqToY}
          graphHeight={graphHeight}
          noteFrequencies={NOTE_FREQUENCIES_MAP}
          activeNoteIndex={activeNoteIndex}
          isRecording={isRecording}
          isPaused={isPaused}
        />

        <View style={styles.graphContainer}>
          {renderGraph}

          <FrequencyDisplay
            pitch={pitch}
            isRecording={isRecording}
            isPaused={isPaused}
            getCurrentTargetInfo={getCurrentTargetInfo}
            noteFrequencies={NOTE_FREQUENCIES_MAP}
          />
        </View>
      </View>

      <PlayStopButton
        isRecording={isRecording}
        onPress={handlePlayStopToggle}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  graphContainer: {
    flex: 1,
    position: 'relative',
  },
})

export default TuneTrackerGame
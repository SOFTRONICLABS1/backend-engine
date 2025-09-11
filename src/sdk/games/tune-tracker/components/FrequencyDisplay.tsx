import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface FrequencyDisplayProps {
  pitch: number
  isRecording: boolean
  isPaused: boolean
  getCurrentTargetInfo: () => { note: string; frequency: number } | null
  noteFrequencies: Record<string, number>
}

export const FrequencyDisplay: React.FC<FrequencyDisplayProps> = ({
  pitch,
  isRecording,
  isPaused,
  getCurrentTargetInfo,
  noteFrequencies,
}) => {
  if (!isRecording || isPaused) {
    return null
  }

  const renderCurrentPitch = () => {
    if (pitch <= 0) return null
    
    return (
      <View style={styles.hzDisplayTopRight}>
        <Text style={styles.hzTextTopRight}>{pitch.toFixed(1)} Hz</Text>
      </View>
    )
  }

  const renderTargetNote = () => {
    const targetInfo = getCurrentTargetInfo()
    
    if (!targetInfo && pitch > 0) {
      // Show closest note when no target is active
      let closestNote = ""
      let closestFreq = 0
      let minDiff = Infinity
      
      for (const [note, noteFreq] of Object.entries(noteFrequencies)) {
        const diff = Math.abs(pitch - (noteFreq as number))
        if (diff < minDiff) {
          minDiff = diff
          closestNote = note
          closestFreq = noteFreq as number
        }
      }
      
      if (closestNote) {
        return (
          <View style={[styles.targetNoteDisplay, { backgroundColor: 'rgba(52,152,219,0.9)' }]}>
            <Text style={styles.targetNoteText}>Closest: {closestNote}</Text>
            <Text style={styles.targetFreqText}>{closestFreq.toFixed(1)} Hz</Text>
          </View>
        )
      }
    }
    
    if (targetInfo) {
      return (
        <View style={styles.targetNoteDisplay}>
          <Text style={styles.targetNoteText}>Target: {targetInfo.note}</Text>
          <Text style={styles.targetFreqText}>{targetInfo.frequency.toFixed(1)} Hz</Text>
          {pitch > 0 && (
            <>
              <View style={styles.frequencyDivider} />
              <Text style={styles.currentFreqLabel}>Current:</Text>
              <Text style={styles.currentFreqText}>{pitch.toFixed(1)} Hz</Text>
            </>
          )}
        </View>
      )
    }
    
    return null
  }

  return (
    <>
      {renderCurrentPitch()}
      {renderTargetNote()}
    </>
  )
}

const styles = StyleSheet.create({
  hzDisplayTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(44, 62, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34495e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  hzTextTopRight: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  targetNoteDisplay: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
    minWidth: 100,
  },
  targetNoteText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  targetFreqText: {
    color: '#2c3e50',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  frequencyDivider: {
    height: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.3)',
    marginVertical: 6,
    marginHorizontal: 4,
  },
  currentFreqLabel: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  currentFreqText: {
    color: '#2c3e50',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
})
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface PianoKeyboardProps {
  pianoNotes: string[]
  freqToY: (freq: number) => number
  graphHeight: number
  noteFrequencies: Record<string, number>
  activeNoteIndex: number
  isRecording: boolean
  isPaused: boolean
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  pianoNotes,
  freqToY,
  graphHeight,
  noteFrequencies,
  activeNoteIndex,
  isRecording,
  isPaused,
}) => {
  const keyHeight = graphHeight / pianoNotes.length

  return (
    <View style={styles.pianoContainer}>
      {pianoNotes.map((note, index) => {
        const freq = noteFrequencies[note]
        const yPos = freq ? freqToY(freq) - keyHeight / 2 : index * keyHeight
        const isBlackKey = note.includes('#')
        const isActive = activeNoteIndex === index && isRecording && !isPaused

        return (
          <View
            key={`piano-${note}-${index}`}
            style={[
              styles.pianoKey,
              {
                position: 'absolute',
                top: Math.max(0, Math.min(graphHeight - keyHeight, yPos)),
                height: keyHeight - 1,
              },
              isBlackKey ? styles.blackKey : styles.whiteKey,
              isActive && styles.activeKey,
            ]}
          >
            <Text
              style={[
                styles.keyText,
                isBlackKey ? styles.blackKeyText : styles.whiteKeyText,
                isActive && styles.activeKeyText,
              ]}
            >
              {note}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  pianoContainer: {
    width: 80,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  pianoKey: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#dee2e6',
    borderRadius: 6,
    marginVertical: 0.5,
    marginHorizontal: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    width: 68,
  },
  whiteKey: {
    backgroundColor: '#ffffff',
    borderColor: '#dee2e6',
  },
  blackKey: {
    backgroundColor: '#495057',
    borderColor: '#6c757d',
  },
  activeKey: {
    backgroundColor: '#007bff',
    borderColor: '#0056b3',
    shadowColor: '#007bff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    transform: [{ scale: 1.05 }],
  },
  keyText: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  whiteKeyText: {
    color: '#495057',
  },
  blackKeyText: {
    color: '#f8f9fa',
  },
  activeKeyText: {
    color: '#ffffff',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
})
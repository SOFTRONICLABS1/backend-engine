import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface PlayStopButtonProps {
  isRecording: boolean
  onPress: () => void
}

export const PlayStopButton: React.FC<PlayStopButtonProps> = ({
  isRecording,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.mainControlButton} onPress={onPress}>
      <Ionicons name={isRecording ? "stop" : "play"} size={32} color="#fff" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  mainControlButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
})
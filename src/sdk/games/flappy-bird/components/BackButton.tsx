import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface BackButtonProps {
  onPress: () => void
}

export const BackButton: React.FC<BackButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.backButton} onPress={onPress}>
      <Ionicons name="chevron-back" size={24} color="#fff" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
})
import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface TopBarProps {
  onBack: () => void
  title?: string
}

export const TopBar: React.FC<TopBarProps> = ({
  onBack,
  title = 'Tune Tracker',
}) => {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.screenTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  topBar: {
    height: 40,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
})
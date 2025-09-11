import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface GameUIProps {
  score: number
  cycle: number
  gameState: 'menu' | 'playing' | 'dying' | 'gameOver'
  onPause: () => void
  getOverallAccuracy: () => {
    cycleAccuracy: number | null
    noteAccuracy: number | null
  }
}

export const GameUI: React.FC<GameUIProps> = ({
  score,
  cycle,
  gameState,
  onPause,
  getOverallAccuracy,
}) => {
  if (gameState !== 'playing' && gameState !== 'dying') {
    return null
  }

  return (
    <View style={[styles.gameUIContainer, { zIndex: 10 }]}>
      {/* Left side - Score Container */}
      <View style={styles.leftUIContainer}>
        <View style={styles.scoreContainer}>
          <Text style={styles.gameScore}>Score: {score}</Text>
        </View>
        
        {/* Accuracy Container */}
        {(() => {
          const accuracy = getOverallAccuracy()
          if (accuracy.cycleAccuracy !== null || accuracy.noteAccuracy !== null) {
            return (
              <View style={styles.accuracyContainer}>
                {accuracy.cycleAccuracy !== null ? (
                  <Text style={styles.accuracyLabel}>
                    Cycle: {accuracy.cycleAccuracy.toFixed(1)}%
                  </Text>
                ) : (
                  <Text style={styles.accuracyLabel}>
                    Note: {accuracy.noteAccuracy!.toFixed(1)}%
                  </Text>
                )}
              </View>
            )
          }
          return null
        })()}
      </View>
      
      {/* Right side - Pause Button and Cycle Container */}
      <View style={styles.rightUIContainer}>
        <TouchableOpacity style={styles.pauseButton} onPress={onPause}>
          <Ionicons name="pause" size={20} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.cycleContainer}>
          <Text style={styles.cycleInfo}>Cycle: {cycle}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  gameUIContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftUIContainer: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-start',
  },
  rightUIContainer: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-end',
  },
  scoreContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cycleContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  accuracyContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gameScore: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  cycleInfo: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  accuracyLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  pauseButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
})
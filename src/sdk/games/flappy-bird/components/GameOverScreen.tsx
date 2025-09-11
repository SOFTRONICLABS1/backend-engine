import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface GameOverScreenProps {
  score: number
  cycle: number
  noteAccuracies: number[]
  onPlayAgain: () => void
  onMenu: () => void
  getOverallAccuracy: () => {
    cycleAccuracy: number | null
    noteAccuracy: number | null
  }
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  cycle,
  noteAccuracies,
  onPlayAgain,
  onMenu,
  getOverallAccuracy,
}) => {
  return (
    <View style={styles.scoreMainContainer}>
      {/* Enhanced Background */}
      <View style={styles.scoreBackground}>
        <View style={styles.scoreGradientOverlay} />
        
        {/* Floating score elements */}
        <View style={styles.scoreFloatingElement1} />
        <View style={styles.scoreFloatingElement2} />
      </View>
      
      <View style={styles.enhancedGameOverContainer}>
        {/* Enhanced Title Section */}
        <View style={styles.gameOverTitleSection}>
          <View style={styles.gameOverTitleGlow} />
          <Text style={styles.enhancedGameOverTitle}>🎵 Game Complete!</Text>
          <View style={styles.gameOverSubtitleContainer}>
            <Ionicons name="trophy" size={20} color="#FFD700" />
            <Text style={styles.gameOverSubtitle}>Your Performance Summary</Text>
          </View>
        </View>

        {/* Enhanced Score Display */}
        <View style={styles.mainScoreContainer}>
          <View style={styles.scoreIconContainer}>
            <Ionicons name="musical-notes" size={32} color="#FFD700" />
          </View>
          <Text style={styles.enhancedScoreText}>{score}</Text>
          <Text style={styles.scoreLabel}>Notes Completed</Text>
        </View>
        
        {/* Enhanced Accuracy Display */}
        <View style={styles.enhancedAccuracySection}>
          <View style={styles.accuracyHeader}>
            <Ionicons name="analytics" size={24} color="#4CAF50" />
            <Text style={styles.accuracySectionTitle}>Accuracy Breakdown</Text>
          </View>
          
          <View style={styles.accuracyGrid}>
            {/* Note Accuracy Card */}
            {noteAccuracies.length > 0 && (
              <View style={styles.accuracyCard}>
                <View style={styles.accuracyCardHeader}>
                  <Ionicons name="musical-note" size={20} color="#2196F3" />
                  <Text style={styles.accuracyCardTitle}>Note Accuracy</Text>
                </View>
                <Text style={styles.accuracyCardValue}>
                  {(noteAccuracies.reduce((sum, acc) => sum + acc, 0) / noteAccuracies.length).toFixed(1)}%
                </Text>
                <Text style={styles.accuracyCardDescription}>Average per note</Text>
              </View>
            )}
            
            {/* Cycles Completed Card */}
            <View style={styles.accuracyCard}>
              <View style={styles.accuracyCardHeader}>
                <Ionicons name="refresh" size={20} color="#FF9800" />
                <Text style={styles.accuracyCardTitle}>Cycles</Text>
              </View>
              <Text style={styles.accuracyCardValue}>{cycle}</Text>
              <Text style={styles.accuracyCardDescription}>Completed</Text>
            </View>
            
            {/* Overall Accuracy Card - Only show when cycles completed > 0 */}
            {cycle > 0 && (
              <View style={[styles.accuracyCard, styles.overallAccuracyCard]}>
                <View style={styles.accuracyCardHeader}>
                  <Ionicons name="trophy" size={20} color="#FFD700" />
                  <Text style={styles.accuracyCardTitle}>Overall</Text>
                </View>
                {(() => {
                  const accuracy = getOverallAccuracy()
                  if (accuracy.cycleAccuracy !== null) {
                    return (
                      <>
                        <Text style={styles.overallAccuracyValue}>
                          {accuracy.cycleAccuracy.toFixed(1)}%
                        </Text>
                        <Text style={styles.accuracyCardDescription}>Cycle Average</Text>
                      </>
                    )
                  } else if (accuracy.noteAccuracy !== null) {
                    return (
                      <>
                        <Text style={styles.overallAccuracyValue}>
                          {accuracy.noteAccuracy.toFixed(1)}%
                        </Text>
                        <Text style={styles.accuracyCardDescription}>Note Average</Text>
                      </>
                    )
                  }
                  return (
                    <>
                      <Text style={styles.overallAccuracyValue}>--</Text>
                      <Text style={styles.accuracyCardDescription}>No Data</Text>
                    </>
                  )
                })()}
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.enhancedButtonRow}>
          <TouchableOpacity style={styles.enhancedActionButton} onPress={onPlayAgain}>
            <View style={styles.actionButtonGlow} />
            <View style={styles.actionButtonContent}>
              <Ionicons name="refresh" size={24} color="#fff" />
              <Text style={styles.enhancedActionButtonText}>PLAY AGAIN</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.enhancedActionButton, styles.menuActionButton]} onPress={onMenu}>
            <View style={styles.actionButtonContent}>
              <Ionicons name="home" size={24} color="#fff" />
              <Text style={styles.enhancedActionButtonText}>MENU</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  scoreMainContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#2c3e50',
  },
  scoreBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2c3e50',
  },
  scoreGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
  },
  scoreFloatingElement1: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  scoreFloatingElement2: {
    position: 'absolute',
    bottom: '20%',
    left: '15%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  enhancedGameOverContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  gameOverTitleSection: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  gameOverTitleGlow: {
    position: 'absolute',
    top: -10,
    left: -20,
    right: -20,
    bottom: -10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
    zIndex: -1,
  },
  enhancedGameOverTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  gameOverSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameOverSubtitle: {
    fontSize: 18,
    color: '#bdc3c7',
    fontWeight: '600',
  },
  mainScoreContainer: {
    backgroundColor: 'rgba(52, 73, 94, 0.8)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scoreIconContainer: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 50,
  },
  enhancedScoreText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFD700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  scoreLabel: {
    fontSize: 18,
    color: '#ecf0f1',
    fontWeight: '600',
    marginTop: 8,
  },
  enhancedAccuracySection: {
    width: '100%',
    marginBottom: 40,
  },
  accuracyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  accuracySectionTitle: {
    fontSize: 22,
    color: '#ecf0f1',
    fontWeight: '700',
  },
  accuracyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  accuracyCard: {
    backgroundColor: 'rgba(52, 73, 94, 0.9)',
    borderRadius: 15,
    padding: 20,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  overallAccuracyCard: {
    borderColor: 'rgba(255, 215, 0, 0.4)',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  accuracyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  accuracyCardTitle: {
    fontSize: 14,
    color: '#ecf0f1',
    fontWeight: '600',
  },
  accuracyCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3498db',
    marginBottom: 5,
  },
  overallAccuracyValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFD700',
    marginBottom: 5,
  },
  accuracyCardDescription: {
    fontSize: 12,
    color: '#bdc3c7',
    textAlign: 'center',
    fontWeight: '500',
  },
  enhancedButtonRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  enhancedActionButton: {
    backgroundColor: '#3498db',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuActionButton: {
    backgroundColor: '#95a5a6',
  },
  actionButtonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
    borderRadius: 17,
    zIndex: -1,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  enhancedActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
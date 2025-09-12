import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export interface GameStats {
  score: number
  noteAccuracies?: number[]
  cycleAccuracies?: number[]
  completedCycles?: number
  customStats?: { [key: string]: any }
}

export interface GameOverScreenProps {
  gameName: string
  stats: GameStats
  onPlayAgain: (() => void) | (() => Promise<void>)
  onBackToMenu: (() => void) | (() => Promise<void>)
  scoreLabel?: string
  customContent?: React.ReactNode
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  gameName,
  stats,
  onPlayAgain,
  onBackToMenu,
  scoreLabel = "Score",
  customContent
}) => {
  const [isPlayAgainLoading, setIsPlayAgainLoading] = useState(false)
  const [isBackToMenuLoading, setIsBackToMenuLoading] = useState(false)
  
  const overallNoteAccuracy = stats.noteAccuracies && stats.noteAccuracies.length > 0 
    ? stats.noteAccuracies.reduce((sum, acc) => sum + acc, 0) / stats.noteAccuracies.length 
    : 0
    
  const overallCycleAccuracy = stats.cycleAccuracies && stats.cycleAccuracies.length > 0
    ? stats.cycleAccuracies.reduce((sum, acc) => sum + acc, 0) / stats.cycleAccuracies.length
    : 0
    
  const handlePlayAgain = async () => {
    if (isPlayAgainLoading || isBackToMenuLoading) return
    
    try {
      setIsPlayAgainLoading(true)
      await onPlayAgain()
    } catch (error) {
      console.error('Error in play again:', error)
    } finally {
      setIsPlayAgainLoading(false)
    }
  }
  
  const handleBackToMenu = async () => {
    if (isPlayAgainLoading || isBackToMenuLoading) return
    
    try {
      setIsBackToMenuLoading(true)
      await onBackToMenu()
    } catch (error) {
      console.error('Error in back to menu:', error)
    } finally {
      setIsBackToMenuLoading(false)
    }
  }

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
          <Text style={styles.enhancedScoreText}>{stats.score}</Text>
          <Text style={styles.scoreLabel}>{scoreLabel}</Text>
        </View>
        
        {/* Enhanced Accuracy Display - only show if accuracy data exists */}
        {(stats.noteAccuracies || stats.completedCycles !== undefined) && (
          <View style={styles.enhancedAccuracySection}>
            <View style={styles.accuracyHeader}>
              <Ionicons name="analytics" size={24} color="#4CAF50" />
              <Text style={styles.accuracySectionTitle}>Accuracy Breakdown</Text>
            </View>
            
            <View style={styles.accuracyGrid}>
              {/* Note Accuracy Card */}
              {stats.noteAccuracies && stats.noteAccuracies.length > 0 && (
                <View style={styles.accuracyCard}>
                  <View style={styles.accuracyCardHeader}>
                    <Ionicons name="musical-note" size={20} color="#2196F3" />
                    <Text style={styles.accuracyCardTitle}>Note Accuracy</Text>
                  </View>
                  <Text style={styles.accuracyCardValue}>
                    {overallNoteAccuracy.toFixed(1)}%
                  </Text>
                  <Text style={styles.accuracyCardDescription}>Average per note</Text>
                </View>
              )}
              
              {/* Cycles Completed Card */}
              {stats.completedCycles !== undefined && (
                <View style={styles.accuracyCard}>
                  <View style={styles.accuracyCardHeader}>
                    <Ionicons name="refresh" size={20} color="#FF9800" />
                    <Text style={styles.accuracyCardTitle}>Cycles</Text>
                  </View>
                  <Text style={styles.accuracyCardValue}>{stats.completedCycles}</Text>
                  <Text style={styles.accuracyCardDescription}>Completed</Text>
                </View>
              )}
              
              {/* Overall Cycle Accuracy Card */}
              {stats.cycleAccuracies && stats.cycleAccuracies.length > 0 && (
                <View style={[styles.accuracyCard, styles.overallAccuracyCard]}>
                  <View style={styles.accuracyCardHeader}>
                    <Ionicons name="trophy" size={20} color="#FFD700" />
                    <Text style={styles.accuracyCardTitle}>Overall</Text>
                  </View>
                  <Text style={styles.overallAccuracyValue}>
                    {overallCycleAccuracy.toFixed(1)}%
                  </Text>
                  <Text style={styles.accuracyCardDescription}>Cycle Average</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Custom content if provided */}
        {customContent}
        
        <View style={styles.enhancedButtonRow}>
          <TouchableOpacity 
            style={[styles.enhancedActionButton, (isPlayAgainLoading || isBackToMenuLoading) && styles.disabledButton]} 
            onPress={handlePlayAgain}
            disabled={isPlayAgainLoading || isBackToMenuLoading}
          >
            <View style={styles.actionButtonGlow} />
            <View style={styles.actionButtonContent}>
              {isPlayAgainLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={24} color="#fff" />
              )}
              <Text style={styles.enhancedActionButtonText}>
                {isPlayAgainLoading ? 'SUBMITTING...' : 'PLAY AGAIN'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.enhancedActionButton, styles.menuActionButton, (isPlayAgainLoading || isBackToMenuLoading) && styles.disabledButton]} 
            onPress={handleBackToMenu}
            disabled={isPlayAgainLoading || isBackToMenuLoading}
          >
            <View style={styles.actionButtonContent}>
              {isBackToMenuLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="home" size={24} color="#fff" />
              )}
              <Text style={styles.enhancedActionButtonText}>
                {isBackToMenuLoading ? 'SUBMITTING...' : 'MENU'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  scoreBackground: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: '#1a1a2e' 
  },
  scoreGradientOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0, 0, 0, 0.3)' 
  },
  scoreFloatingElement1: { 
    position: 'absolute', 
    top: 50, 
    right: 30, 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: 'rgba(255, 215, 0, 0.1)', 
    transform: [{ rotate: '45deg' }] 
  },
  scoreFloatingElement2: { 
    position: 'absolute', 
    bottom: 100, 
    left: 20, 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: 'rgba(52, 152, 219, 0.1)' 
  },
  scoreMainContainer: { 
    flex: 1, 
    backgroundColor: '#1a1a2e' 
  },
  enhancedGameOverContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    zIndex: 10 
  },
  gameOverTitleSection: { 
    alignItems: 'center', 
    marginBottom: 30, 
    position: 'relative' 
  },
  gameOverTitleGlow: { 
    position: 'absolute', 
    top: -20, 
    left: -40, 
    right: -40, 
    bottom: -20, 
    backgroundColor: 'rgba(255, 215, 0, 0.05)', 
    borderRadius: 20 
  },
  enhancedGameOverTitle: { 
    fontSize: 36, 
    fontWeight: 'bold', 
    color: '#fff', 
    textAlign: 'center', 
    marginBottom: 10, 
    textShadowColor: 'rgba(0, 0, 0, 0.5)', 
    textShadowOffset: { width: 0, height: 2 }, 
    textShadowRadius: 10 
  },
  gameOverSubtitleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  gameOverSubtitle: { 
    fontSize: 16, 
    color: '#bdc3c7', 
    fontWeight: '600' 
  },
  mainScoreContainer: { 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderRadius: 20, 
    padding: 30, 
    alignItems: 'center', 
    marginBottom: 30, 
    borderWidth: 2, 
    borderColor: 'rgba(255, 215, 0, 0.3)' 
  },
  scoreIconContainer: { 
    marginBottom: 15 
  },
  enhancedScoreText: { 
    fontSize: 56, 
    fontWeight: 'bold', 
    color: '#FFD700', 
    textShadowColor: 'rgba(0, 0, 0, 0.3)', 
    textShadowOffset: { width: 0, height: 2 }, 
    textShadowRadius: 8 
  },
  scoreLabel: { 
    fontSize: 18, 
    color: '#ecf0f1', 
    marginTop: 10, 
    fontWeight: '600' 
  },
  enhancedAccuracySection: { 
    width: '100%', 
    marginBottom: 30 
  },
  accuracyHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10, 
    marginBottom: 20 
  },
  accuracySectionTitle: { 
    fontSize: 20, 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  accuracyGrid: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 15, 
    flexWrap: 'wrap' 
  },
  accuracyCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.08)', 
    borderRadius: 15, 
    padding: 15, 
    minWidth: 140, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.1)' 
  },
  accuracyCardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginBottom: 10 
  },
  accuracyCardTitle: { 
    fontSize: 14, 
    color: '#bdc3c7', 
    fontWeight: '600' 
  },
  accuracyCardValue: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 5 
  },
  accuracyCardDescription: { 
    fontSize: 12, 
    color: '#95a5a6' 
  },
  overallAccuracyCard: { 
    borderColor: 'rgba(255, 215, 0, 0.3)', 
    backgroundColor: 'rgba(255, 215, 0, 0.05)' 
  },
  overallAccuracyValue: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#FFD700' 
  },
  enhancedButtonRow: { 
    flexDirection: 'row', 
    gap: 15 
  },
  enhancedActionButton: { 
    backgroundColor: '#3498db', 
    paddingHorizontal: 25, 
    paddingVertical: 15, 
    borderRadius: 25, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    position: 'relative', 
    overflow: 'hidden' 
  },
  menuActionButton: { 
    backgroundColor: '#95a5a6' 
  },
  actionButtonGlow: { 
    position: 'absolute', 
    top: -10, 
    left: -10, 
    right: -10, 
    bottom: -10, 
    backgroundColor: 'rgba(52, 152, 219, 0.2)', 
    borderRadius: 25 
  },
  actionButtonContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    zIndex: 1 
  },
  enhancedActionButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    textTransform: 'uppercase' 
  },
  disabledButton: {
    opacity: 0.6
  }
})
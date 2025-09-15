import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { handleGameExit } from '../../../../utils/gameNavigation'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type BPM = 20 | 40 | 60 | 120

export interface GameMenuProps {
  gameName: string
  onStartGame: (difficulty: Difficulty, bpm: BPM) => void
  micAccess?: 'granted' | 'denied' | 'pending' | 'requesting'
  isActive?: boolean
  showDifficulty?: boolean
  showBPM?: boolean
  customSettings?: React.ReactNode
}

export const GameMenu: React.FC<GameMenuProps> = ({
  gameName,
  onStartGame,
  micAccess = 'granted',
  isActive = true,
  showDifficulty = true,
  showBPM = true,
  customSettings
}) => {
  const navigation = useNavigation()
  const [difficulty, setDifficulty] = React.useState<Difficulty>('easy')
  const [bpm, setBpm] = React.useState<BPM>(60)

  const handleStart = () => {
    onStartGame(difficulty, bpm)
  }

  return (
    <View style={styles.container}>
      {/* Background matching score page */}
      <View style={styles.scoreBackground}>
        <View style={styles.scoreGradientOverlay} />
      </View>
      
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => handleGameExit(navigation as any, { stepsBack: 1 })}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      
      <View style={styles.menuContainer}>
        {/* Game name at top */}
        <Text style={styles.title}>{gameName}</Text>
        
        {/* Difficulty buttons - 3 horizontally aligned */}
        {showDifficulty && (
          <View style={styles.settingsContainer}>
            <Text style={styles.settingsTitle}>Difficulty</Text>
            <View style={styles.buttonRow}>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.settingButton,
                    difficulty === diff && styles.selectedButton
                  ]}
                  onPress={() => setDifficulty(diff)}
                >
                  <Text style={[
                    styles.buttonText,
                    difficulty === diff && styles.selectedButtonText
                  ]}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {/* BPM buttons - horizontally aligned */}
        {showBPM && (
          <View style={styles.settingsContainer}>
            <Text style={styles.settingsTitle}>BPM</Text>
            <View style={styles.buttonRow}>
              {([20, 40, 60, 120] as BPM[]).map(bpmValue => (
                <TouchableOpacity
                  key={bpmValue}
                  style={[
                    styles.settingButton,
                    bpm === bpmValue && styles.selectedButton
                  ]}
                  onPress={() => setBpm(bpmValue)}
                >
                  <Text style={[
                    styles.buttonText,
                    bpm === bpmValue && styles.selectedButtonText
                  ]}>
                    {bpmValue}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {/* Custom settings if provided */}
        {customSettings}
        
        {/* Start game button at bottom */}
        <TouchableOpacity style={styles.playButton} onPress={handleStart}>
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.playButtonText}>Start Game</Text>
        </TouchableOpacity>
        
        {!isActive && (
          <View style={styles.warningContainer}>
            <Ionicons name="mic-off" size={20} color="#ff6b6b" />
            <Text style={styles.warningText}>
              {micAccess !== "granted" ? "Microphone access required" : "Initializing microphone..."}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a' 
  },
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
  backButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    borderRadius: 20, 
    position: 'absolute', 
    top: 60, 
    left: 20, 
    zIndex: 100 
  },
  menuContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  title: { 
    fontSize: 48, 
    fontWeight: 'bold', 
    color: '#fff', 
    textAlign: 'center', 
    marginBottom: 30 
  },
  settingsContainer: { 
    marginBottom: 40, 
    alignItems: 'center' 
  },
  settingsTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 15, 
    marginTop: 20 
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: 10, 
    marginBottom: 10 
  },
  settingButton: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    backgroundColor: '#ecf0f1', 
    borderRadius: 8, 
    minWidth: 60 
  },
  selectedButton: { 
    backgroundColor: '#3498db' 
  },
  buttonText: { 
    color: '#2c3e50', 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
  selectedButtonText: { 
    color: '#fff' 
  },
  playButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#27ae60', 
    paddingHorizontal: 30, 
    paddingVertical: 15, 
    borderRadius: 25, 
    gap: 10 
  },
  playButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  warningContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 20, 
    padding: 10, 
    backgroundColor: 'rgba(255, 107, 107, 0.1)', 
    borderRadius: 8, 
    gap: 8 
  },
  warningText: { 
    color: '#ff6b6b', 
    fontSize: 14 
  }
})
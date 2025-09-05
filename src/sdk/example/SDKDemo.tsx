import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { GameLauncher, MobileSdk } from '../index'
import type { GamePayload } from '../index'

// Example usage of the Mobile SDK
export const SDKDemo: React.FC = () => {
  // Example payload that matches the user's requirements
  const examplePayload: GamePayload = {
    userId: "e4aad36b-ecb7-45b3-886b-616364a15bfb",
    gameId: "2d6263d7-d4a4-4074-8be3-430120ac1cc5", // Flappy Bird
    notes: {
      title: "Cheap Thrills",
      measures: [
        {
          notes: [
            { beat: 1, pitch: "E3", duration: 100 },
            { beat: 1, pitch: "G3", duration: 100 },
            { beat: 1, pitch: "B3", duration: 100 },
            { beat: 1, pitch: "E4", duration: 200 },
            { beat: 1, pitch: "B3", duration: 100 },
            { beat: 1, pitch: "G3", duration: 100 },
            { beat: 1, pitch: "E3", duration: 200 }
          ],
          measure_number: 1
        }
      ],
      key_signature: "C",
      time_signature: "4/4"
    }
  }

  // SDK usage examples
  const handleTestSDK = () => {
    console.log('=== Mobile SDK Demo ===')
    
    // 1. Validate payload
    const validation = MobileSdk.validatePayload(examplePayload)
    console.log('Payload validation:', validation)
    
    // 2. Check if game ID is valid
    const isValid = MobileSdk.isValidGameId(examplePayload.gameId)
    console.log('Game ID valid:', isValid)
    
    // 3. Get game by ID
    const game = MobileSdk.getGameById(examplePayload.gameId)
    console.log('Game found:', game?.displayName)
    
    // 4. Extract note durations
    const durations = MobileSdk.extractNoteDurations(examplePayload)
    console.log('Note durations:', durations)
    
    // 5. Get available games
    const games = MobileSdk.getAvailableGames()
    console.log('Available games:', games.map(g => g.displayName))
    
    // 6. Launch game (programmatic check)
    const launchResult = MobileSdk.launch(examplePayload)
    console.log('Launch result:', launchResult)
  }

  const handleGameEnd = (score: number) => {
    console.log('Game ended with score:', score)
    alert(`Game Over! Final Score: ${score}`)
  }

  const handleGameError = (error: string) => {
    console.error('Game error:', error)
    alert(`Game Error: ${error}`)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mobile SDK Demo</Text>
      <Text style={styles.subtitle}>Backend Engine for Mobile Games</Text>

      {/* SDK Testing */}
      <TouchableOpacity style={styles.button} onPress={handleTestSDK}>
        <Text style={styles.buttonText}>Test SDK Functions</Text>
      </TouchableOpacity>

      {/* Game Launcher */}
      <View style={styles.gameContainer}>
        <Text style={styles.gameTitle}>Launch Game via SDK:</Text>
        <GameLauncher
          payload={examplePayload}
          onGameEnd={handleGameEnd}
          onError={handleGameError}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
})
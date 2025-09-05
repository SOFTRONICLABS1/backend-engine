import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { GameLauncher, GameLauncherService, MobileSdk } from '../sdk'
import type { GamePayload } from '../sdk'

export const TestGameLauncher: React.FC = () => {
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<string[]>([])

  // Test payload with Flappy Bird game
  const testPayload: GamePayload = {
    userId: "e4aad36b-ecb7-45b3-886b-616364a15bfb",
    gameId: "2d6263d7-d4a4-4074-8be3-430120ac1cc5", // Flappy Bird ID
    notes: {
      title: "Cheap Thrills",
      measures: [
        {
          notes: [
            {
              beat: 1,
              pitch: "E3",
              duration: 100
            },
            {
              beat: 1,
              pitch: "G3",
              duration: 100
            },
            {
              beat: 1,
              pitch: "B3",
              duration: 100
            },
            {
              beat: 1,
              pitch: "E4",
              duration: 200
            },
            {
              beat: 1,
              pitch: "B3",
              duration: 100
            },
            {
              beat: 1,
              pitch: "G3",
              duration: 100
            },
            {
              beat: 1,
              pitch: "E3",
              duration: 200
            }
          ],
          measure_number: 1
        }
      ],
      key_signature: "C",
      time_signature: "4/4"
    }
  }

  const addTestResult = useCallback((result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }, [])

  const runValidationTests = () => {
    addTestResult("=== Running Validation Tests ===")

    // Test 1: Valid payload
    const validResult = GameLauncherService.validatePayload(testPayload)
    addTestResult(`Valid payload test: ${validResult.isValid ? 'PASS' : 'FAIL'} - Errors: ${validResult.errors.join(', ')}`)

    // Test 2: Invalid payload - missing userId
    const invalidPayload1 = { ...testPayload, userId: undefined }
    const invalidResult1 = GameLauncherService.validatePayload(invalidPayload1)
    addTestResult(`Missing userId test: ${!invalidResult1.isValid ? 'PASS' : 'FAIL'} - Errors: ${invalidResult1.errors.join(', ')}`)

    // Test 3: Invalid payload - wrong gameId
    const invalidPayload2 = { ...testPayload, gameId: "invalid-game-id" }
    const invalidResult2 = GameLauncherService.validatePayload(invalidPayload2)
    addTestResult(`Invalid gameId test: ${!invalidResult2.isValid ? 'PASS' : 'FAIL'} - Errors: ${invalidResult2.errors.join(', ')}`)

    // Test 4: Extract note durations
    const durations = GameLauncherService.extractNoteDurations(testPayload)
    addTestResult(`Extract durations test: ${durations.length === 7 ? 'PASS' : 'FAIL'} - Found ${durations.length} durations: [${durations.join(', ')}]`)

    addTestResult("=== Validation Tests Complete ===")
  }

  const runRegistryTests = () => {
    addTestResult("=== Running Registry Tests ===")

    // Test game registry functions
    const games = MobileSdk.getAvailableGames()
    addTestResult(`Available games: ${games.length} found - ${games.map((g: any) => g.displayName).join(', ')}`)

    const isValidId = MobileSdk.isValidGameId("2d6263d7-d4a4-4074-8be3-430120ac1cc5")
    addTestResult(`Valid game ID test: ${isValidId ? 'PASS' : 'FAIL'}`)

    const gameById = MobileSdk.getGameById("2d6263d7-d4a4-4074-8be3-430120ac1cc5")
    addTestResult(`Get game by ID test: ${gameById ? 'PASS' : 'FAIL'} - Found: ${gameById?.displayName}`)

    const gameByName = MobileSdk.getGameByName("flappy-bird")
    addTestResult(`Get game by name test: ${gameByName ? 'PASS' : 'FAIL'} - Found: ${gameByName?.displayName}`)

    addTestResult("=== Registry Tests Complete ===")
  }

  const runLaunchTests = () => {
    addTestResult("=== Running Launch Tests ===")

    // Test successful launch
    const launchResult = MobileSdk.launch(testPayload)
    addTestResult(`Launch test: ${launchResult.success ? 'PASS' : 'FAIL'} - ${launchResult.error || `Game: ${launchResult.gameDefinition?.displayName}`}`)

    // Test failed launch
    const invalidPayload = { ...testPayload, gameId: "invalid-id" }
    const failedLaunchResult = MobileSdk.launch(invalidPayload)
    addTestResult(`Failed launch test: ${!failedLaunchResult.success ? 'PASS' : 'FAIL'} - Error: ${failedLaunchResult.error}`)

    addTestResult("=== Launch Tests Complete ===")
  }

  const runAllTests = () => {
    setTestResults([])
    runValidationTests()
    runRegistryTests()
    runLaunchTests()
  }

  const handleGameEnd = useCallback((score: number) => {
    Alert.alert('Game Ended', `Final Score: ${score}`, [
      { text: 'OK', onPress: () => setCurrentTest(null) }
    ])
    addTestResult(`Game ended with score: ${score}`)
  }, [addTestResult])

  const handleGameError = useCallback((error: string) => {
    Alert.alert('Game Error', error, [
      { text: 'OK', onPress: () => setCurrentTest(null) }
    ])
    addTestResult(`Game error: ${error}`)
  }, [addTestResult])

  if (currentTest === 'launch-game') {
    return (
      <GameLauncher
        payload={testPayload}
        onGameEnd={handleGameEnd}
        onError={handleGameError}
      />
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mobile SDK Test Suite</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={runValidationTests}>
          <Text style={styles.buttonText}>Test Validation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={runRegistryTests}>
          <Text style={styles.buttonText}>Test Registry</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={runLaunchTests}>
          <Text style={styles.buttonText}>Test Launch Logic</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={runAllTests}>
          <Text style={styles.buttonText}>Run All Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.launchButton]} 
          onPress={() => setCurrentTest('launch-game')}
        >
          <Text style={styles.buttonText}>🎮 Launch Flappy Bird</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.clearButton} onPress={() => setTestResults([])}>
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.payloadContainer}>
        <Text style={styles.payloadTitle}>Test Payload:</Text>
        <ScrollView style={styles.payloadScroll}>
          <Text style={styles.payloadText}>
            {JSON.stringify(testPayload, null, 2)}
          </Text>
        </ScrollView>
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
    marginBottom: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  launchButton: {
    backgroundColor: '#27ae60',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  clearButton: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    maxHeight: 200,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  payloadContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    maxHeight: 200,
  },
  payloadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  payloadScroll: {
    flex: 1,
  },
  payloadText: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace',
  },
})
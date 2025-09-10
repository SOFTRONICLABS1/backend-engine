import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Text, SafeAreaView } from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useTheme } from '../../theme/ThemeContext';
import { GameLauncher } from '../../sdk/GameLauncher';
import { handleGameEnd, handleGameError } from '../../utils/gameNavigation';
import { initializeGlobalMicrophone } from '../../hooks/useGlobalMicrophoneManager';
import HeadphoneService from '../../services/HeadphoneService';

export default function GameScreen({ route, navigation }) {
  const { theme } = useTheme();
  const [gameStarted, setGameStarted] = useState(false);
  const [headphonesConnected, setHeadphonesConnected] = useState(false);
  const { contentId, gameId, gameTitle, payload, onGameEnd, onError } = route.params || {};

  // Initialize microphone and headphone monitoring when entering individual game screen
  useEffect(() => {
    const initializeMicrophone = async () => {
      try {
        console.log('🎤 GameScreen: Initializing microphone for game play...');
        await initializeGlobalMicrophone();
        console.log('🎤 GameScreen: Microphone system initialized successfully');
      } catch (error) {
        console.error('🎤 GameScreen: Failed to initialize microphone system:', error);
      }
    };

    const initializeHeadphoneMonitoring = () => {
      // Get initial headphone status
      const initialStatus = HeadphoneService.getCurrentStatus();
      setHeadphonesConnected(initialStatus.isConnected);
      
      // Listen for headphone changes
      const unsubscribe = HeadphoneService.addListener((status) => {
        console.log('🎧 GameScreen: Headphone status changed:', status);
        setHeadphonesConnected(status.isConnected);
        
        if (!status.isConnected && gameStarted) {
          Alert.alert(
            'Headphones Disconnected',
            'Your headphones have been disconnected. The game will pause until you reconnect them.',
            [{ text: 'OK' }]
          );
          setGameStarted(false);
        }
      });
      
      return unsubscribe;
    };

    initializeMicrophone();
    const unsubscribe = initializeHeadphoneMonitoring();
    
    return () => {
      unsubscribe();
    };
  }, [gameStarted]);

  const handleContentLoad = (content) => {
    console.log('Game content loaded:', content);
    setGameStarted(true);
  };

  const handleGameEnd = (score, content) => {
    console.log('Game ended:', { score, content });
    Alert.alert(
      'Game Finished!',
      `Your score: ${score}\nGame: ${content?.title || gameTitle}`,
      [
        { text: 'Play Again', onPress: () => setGameStarted(false) },
        { text: 'Close', onPress: () => navigation.goBack() }
      ]
    );
  };

  const handleError = (error) => {
    console.error('GameSDK Error:', error);
    Alert.alert(
      'Game Error',
      error?.message || 'Failed to load game',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const handleClose = () => {
    setGameStarted(false);
    navigation.goBack();
  };

  const handleStartGame = () => {
    // Check if headphones are connected before starting the game
    if (!headphonesConnected) {
      Alert.alert(
        'Headphones Required',
        'You need to connect headphones to play games. Please connect your headphones and try again.',
        [
          { 
            text: 'Retry', 
            onPress: () => {
              const status = HeadphoneService.getCurrentStatus();
              setHeadphonesConnected(status.isConnected);
              if (status.isConnected) {
                handleStartGame();
              }
            }
          },
          { text: 'Cancel', onPress: () => navigation.goBack() }
        ]
      );
      return;
    }

    Alert.alert(
      'Game Starting!',
      `Loading ${gameTitle}...\n\nContent ID: ${contentId}\nGame ID: ${gameId}`,
      [
        { text: 'Start Playing', onPress: () => setGameStarted(true) },
        { text: 'Cancel', onPress: () => navigation.goBack() }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Game Content */}
      <View style={styles.gameContainer}>
        {payload ? (
          // Use GameLauncher when payload is available
          <GameLauncher
            payload={payload}
            onGameEnd={(score) => {
              console.log('Game ended with score:', score);
              onGameEnd?.(score);
              handleGameEnd(navigation, score);
            }}
            onError={(error) => {
              console.error('Game error:', error);
              onError?.(error);
              handleGameError(navigation, error);
            }}
          />
        ) : contentId && gameId ? (
          <View style={styles.gameContent}>
            {!gameStarted ? (
              <View style={styles.gameStartContainer}>
                <View style={[styles.gameIcon, { backgroundColor: theme.primary }]}>
                  <IconSymbol name="gamecontroller.fill" size={60} color="white" />
                </View>
                <Text style={[styles.gameTitle, { color: theme.text }]}>
                  {gameTitle}
                </Text>
                <Text style={[styles.gameDescription, { color: theme.textSecondary }]}>
                  Ready to start your gaming experience?
                </Text>
                
                {/* Headphone Status Indicator */}
                <View style={styles.headphoneStatus}>
                  <IconSymbol 
                    name={headphonesConnected ? "headphones" : "headphones.slash"} 
                    size={20} 
                    color={headphonesConnected ? theme.success || '#4CAF50' : theme.error || '#F44336'} 
                  />
                  <Text style={[
                    styles.headphoneStatusText, 
                    { color: headphonesConnected ? theme.success || '#4CAF50' : theme.error || '#F44336' }
                  ]}>
                    {headphonesConnected ? 'Headphones Connected' : 'Headphones Required'}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.startButton, 
                    { backgroundColor: headphonesConnected ? theme.primary : theme.textSecondary }
                  ]}
                  onPress={handleStartGame}
                  disabled={!headphonesConnected}
                >
                  <IconSymbol name="play.fill" size={24} color="white" />
                  <Text style={styles.startButtonText}>
                    {headphonesConnected ? 'Start Game' : 'Connect Headphones First'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.gameplayContainer}>
                <Text style={[styles.gameplayText, { color: theme.text }]}>
                  🎮 Game is Running...
                </Text>
                <Text style={[styles.gameInstructions, { color: theme.textSecondary }]}>
                  Use your voice to control the game!
                </Text>
                <TouchableOpacity 
                  style={[styles.endGameButton, { backgroundColor: theme.error }]}
                  onPress={() => handleGameEnd(1250, { title: gameTitle })}
                >
                  <Text style={styles.endGameButtonText}>End Game</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <IconSymbol name="exclamationmark.triangle" size={48} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>
              Missing required parameters: payload or (contentId and gameId)
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gameContainer: {
    flex: 1,
  },
  gameContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameStartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  gameIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  gameDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  headphoneStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  headphoneStatusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  gameplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  gameplayText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  gameInstructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  endGameButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  endGameButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});
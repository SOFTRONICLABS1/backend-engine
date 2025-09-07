import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Text, SafeAreaView } from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useTheme } from '../../theme/ThemeContext';

export default function GameScreen({ route, navigation }) {
  const { theme } = useTheme();
  const [gameStarted, setGameStarted] = useState(false);
  const { contentId, gameId, gameTitle } = route.params || {};

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
      {/* Close button */}
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={handleClose}
      >
        <IconSymbol name="xmark" size={24} color={theme.text} />
      </TouchableOpacity>

      {/* Game Content */}
      <View style={styles.gameContainer}>
        {contentId && gameId ? (
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
                <TouchableOpacity 
                  style={[styles.startButton, { backgroundColor: theme.primary }]}
                  onPress={handleStartGame}
                >
                  <IconSymbol name="play.fill" size={24} color="white" />
                  <Text style={styles.startButtonText}>Start Game</Text>
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
              Missing required parameters: contentId or gameId
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
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  gameContainer: {
    flex: 1,
    marginTop: 60,
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
    marginBottom: 40,
    paddingHorizontal: 20,
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
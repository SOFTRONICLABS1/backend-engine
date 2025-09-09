import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import contentService from '../../api/services/contentService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeGlobalMicrophone } from '../../hooks/useGlobalMicrophoneManager';

export default function GamePayloadScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { gameId, gameTitle, contentId, contentTitle } = route.params || {};

  const [userId, setUserId] = useState(null);
  const [notes, setNotes] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isMicrophoneLoading, setIsMicrophoneLoading] = useState(true);
  const [microphoneError, setMicrophoneError] = useState(null);

  useEffect(() => {
    const loadPayloadData = async () => {
      try {
        setIsLoading(true);
        
        // Get userId from stored auth data
        const userDataString = await AsyncStorage.getItem('user_data');
        let userIdFromAuth = null;
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          userIdFromAuth = userData?.id || null;
        }
        setUserId(userIdFromAuth);

        // Get content details to extract notes
        if (contentId) {
          console.log('===== Fetching content details for notes =====');
          const contentDetails = await contentService.getContentDetails(contentId);
          console.log('===== Content details response:', JSON.stringify(contentDetails, null, 2), '=====');
          setNotes(contentDetails.notes_data || null);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading payload data:', err);
        setError('Failed to load payload data');
      } finally {
        setIsLoading(false);
      }
    };

    loadPayloadData();
  }, [contentId]);

  // Initialize microphone
  useEffect(() => {
    const initializeMicrophone = async () => {
      try {
        setIsMicrophoneLoading(true);
        setMicrophoneError(null);
        console.log('🎤 GamePayloadScreen: Initializing microphone for game...');
        await initializeGlobalMicrophone();
        console.log('🎤 GamePayloadScreen: Microphone system initialized successfully');
        setIsMicrophoneLoading(false);
      } catch (error) {
        console.error('🎤 GamePayloadScreen: Failed to initialize microphone system:', error);
        setMicrophoneError('Failed to access microphone. Please check permissions.');
        setIsMicrophoneLoading(false);
      }
    };

    initializeMicrophone();
  }, []);

  // Auto-launch game when payload and microphone are ready
  useEffect(() => {
    if (!isLoading && !isMicrophoneLoading && userId && gameId && notes && !error && !microphoneError && !isLaunching) {
      console.log('🚀 Auto-launching game with complete payload and microphone ready');
      handleLaunchGame();
    }
  }, [isLoading, isMicrophoneLoading, userId, gameId, notes, error, microphoneError, isLaunching]);


  const handleLaunchGame = () => {
    if (!userId || !gameId || !notes) {
      console.error('Missing required data for game launch:', { userId, gameId, notes });
      return;
    }

    if (isLaunching) {
      console.log('Game launch already in progress, skipping...');
      return;
    }

    setIsLaunching(true);

    try {
      const payload = {
        userId: userId,
        gameId: gameId,
        notes: notes
      };

      console.log('🚀 Launching game with payload:', payload);

      // Navigate to the game screen with the GameLauncher component
      navigation.navigate('Game', {
        payload: payload,
        gameTitle: gameTitle,
        onGameEnd: (score) => {
          console.log('Game ended with score:', score);
          // Navigate back to the games list
          navigation.goBack();
        },
        onError: (error) => {
          console.error('Game error:', error);
          // Navigate back on error
          navigation.goBack();
        }
      });

    } catch (error) {
      console.error('Error launching game:', error);
      setIsLaunching(false);
    }
  };

  // Always show loading screen while preparing payload or launching game
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          {isLoading ? 'Preparing game...' : 
           isMicrophoneLoading ? '🎤 Accessing microphone...' : 
           'Launching game...'}
        </Text>
        <Text style={[styles.gameTitle, { color: theme.primary, marginTop: 16 }]}>
          {gameTitle}
        </Text>
        {/* Show error if payload loading or microphone fails */}
        {(error || microphoneError) && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: 'red' }]}>
              {error || microphoneError}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.retryButtonText, { color: 'white' }]}>
                Go Back
              </Text>
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
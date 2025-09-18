import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import gamesService from '../../api/services/gamesService';
import { initializeGlobalMicrophone } from '../../hooks/useGlobalMicrophoneManager';
import useHeadphoneDetection from '../../hooks/useHeadphoneDetection';

// Import local game thumbnails
const gameThumbnails = {
  flappy: require('../../../assets/thumbnails/flappy.png'),
  tune: require('../../../assets/thumbnails/tune.jpg'),
};

// Function to get local thumbnail based on game name
const getGameThumbnail = (gameTitle) => {
  const title = gameTitle?.toLowerCase() || '';
  
  if (title.includes('flappy') || title.includes('bird')) {
    return gameThumbnails.flappy;
  } else if (title.includes('tune') || title.includes('tracker') || title.includes('track')) {
    return gameThumbnails.tune;
  }
  
  // Fallback to random image if no match found
  return null;
};


export default function GamesScreen() {
  const { theme } = useTheme();
  const { isHeadphoneConnected, audioOutputType, isEmulatorMode } = useHeadphoneDetection();
  const navigation = useNavigation();
  const route = useRoute();
  const { contentId, contentTitle, contentDescription } = route.params || {};
  
  const [userSuggestedGames, setUserSuggestedGames] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(true);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [errorSuggested, setErrorSuggested] = useState(null);
  const [errorAll, setErrorAll] = useState(null);
  const [isMicrophoneLoading, setIsMicrophoneLoading] = useState(true);
  const [microphoneError, setMicrophoneError] = useState(null);

  // Fetch games data on component mount
  useEffect(() => {
    const fetchGames = async () => {
      // Fetch User Suggested Games (content-specific games)
      if (contentId) {
        try {
          console.log('===== Fetching User Suggested Games =====');
          const contentGamesResponse = await gamesService.getContentGames(contentId, 1, 20);
          setUserSuggestedGames(contentGamesResponse.games || []);
          setErrorSuggested(null);
        } catch (error) {
          console.error('Error fetching user suggested games:', error);
          setErrorSuggested('Failed to load suggested games');
          setUserSuggestedGames([]);
        } finally {
          setIsLoadingSuggested(false);
        }
      } else {
        setIsLoadingSuggested(false);
        setUserSuggestedGames([]);
      }
      
      // Fetch All Games
      try {
        console.log('===== Fetching All Games =====');
        const allGamesResponse = await gamesService.getGames(1, 20);
        setAllGames(allGamesResponse.games || allGamesResponse || []);
        setErrorAll(null);
      } catch (error) {
        console.error('Error fetching all games:', error);
        setErrorAll('Failed to load games');
        setAllGames([]);
      } finally {
        setIsLoadingAll(false);
      }
    };
    
    fetchGames();
  }, [contentId]);

  // Initialize microphone when entering games screen
  useEffect(() => {
    const initializeMicrophone = async () => {
      try {
        setIsMicrophoneLoading(true);
        setMicrophoneError(null);
        console.log('🎤 GamesScreen: Initializing microphone for games access...');
        await initializeGlobalMicrophone();
        console.log('🎤 GamesScreen: Microphone system initialized successfully');
        setIsMicrophoneLoading(false);
      } catch (error) {
        console.error('🎤 GamesScreen: Failed to initialize microphone system:', error);
        setMicrophoneError('Failed to access microphone. Please check permissions.');
        setIsMicrophoneLoading(false);
      }
    };

    initializeMicrophone();
  }, []);

  const handleGamePress = (game) => {
    // Check for headphone connection first (skip in emulator mode)
    if (!isHeadphoneConnected && !isEmulatorMode) {
      Alert.alert(
        'Headphones Required',
        'Please connect wired headphones or Bluetooth audio device to play games.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (isMicrophoneLoading) {
      Alert.alert(
        'Microphone Loading',
        'Please wait while microphone access is being initialized...',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (microphoneError) {
      Alert.alert(
        'Microphone Error',
        microphoneError,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Retry', 
            style: 'default',
            onPress: () => {
              setIsMicrophoneLoading(true);
              setMicrophoneError(null);
              initializeGlobalMicrophone()
                .then(() => {
                  setIsMicrophoneLoading(false);
                })
                .catch(() => {
                  setMicrophoneError('Failed to access microphone. Please check permissions.');
                  setIsMicrophoneLoading(false);
                });
            }
          }
        ]
      );
      return;
    }

    console.log('Game selected:', game.title, 'for content:', contentTitle);
    
    // Navigate to GamePayload screen to show payload data
    navigation.navigate('GamePayload', {
      contentId: contentId,
      gameId: game.id,
      gameTitle: game.title,
      contentTitle: contentTitle,
      contentDescription: contentDescription
    });
  };

  const renderGameItem = ({ item }) => {
    const shouldShowLocked = !isHeadphoneConnected && !isEmulatorMode;
    
    return (
      <TouchableOpacity 
        style={[
          styles.gameItem,
          shouldShowLocked && styles.gameItemDisabled
        ]} 
        onPress={() => handleGamePress(item)}
      >
        <Image 
          source={getGameThumbnail(item.title) || { uri: `https://picsum.photos/80/80?random=${item.id}` }}
          style={[
            styles.gameIcon,
            shouldShowLocked && styles.gameIconDisabled
          ]} 
        />
        <Text style={[
          styles.gameName, 
          { color: shouldShowLocked ? theme.textSecondary : theme.text }
        ]} numberOfLines={2}>
          {item.title}
        </Text>
        {shouldShowLocked && (
          <View style={styles.lockedOverlay}>
            <Text style={styles.lockedIcon}>🔒</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  const renderLoadingSection = (title, subtitle) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading games...</Text>
      </View>
    </View>
  );
  
  const renderErrorSection = (title, subtitle, error, onRetry) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={onRetry}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backIcon, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Games</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Emulator Mode Indicator */}
      {isEmulatorMode && (
        <View style={[styles.emulatorModeIndicator, { backgroundColor: '#4CAF50' }]}>
          <View style={styles.headphoneWarningContent}>
            <Text style={styles.headphoneWarningIcon}>📱</Text>
            <View style={styles.headphoneWarningTextContainer}>
              <Text style={styles.headphoneWarningText}>
                Emulator Mode Active
              </Text>
              <Text style={styles.headphoneWarningSubtext}>
                Headphone requirement bypassed for development
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Headphone Connection Warning (only show if not in emulator mode) */}
      {!isHeadphoneConnected && !isEmulatorMode && (
        <View style={[styles.headphoneWarning, { backgroundColor: '#FF4757' }]}>
          <View style={styles.headphoneWarningContent}>
            <Text style={styles.headphoneWarningIcon}>🎧</Text>
            <View style={styles.headphoneWarningTextContainer}>
              <Text style={styles.headphoneWarningText}>
                Headphones Required
              </Text>
              <Text style={styles.headphoneWarningSubtext}>
                {audioOutputType === 'speaker' 
                  ? 'Please connect wired or Bluetooth headphones to play games' 
                  : `Currently connected: ${audioOutputType}`}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Microphone Loading Indicator */}
      {isMicrophoneLoading && (
        <View style={[styles.microphoneLoadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.microphoneLoadingText, { color: theme.textSecondary }]}>
            🎤 Accessing microphone for games...
          </Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>        
        {/* User Suggested Games Section */}
        {isLoadingSuggested ? (
          renderLoadingSection('User Suggested Games', 'Games recommended for you')
        ) : errorSuggested ? (
          renderErrorSection(
            'User Suggested Games', 
            'Games recommended for you',
            errorSuggested,
            () => {
              setIsLoadingSuggested(true);
              setErrorSuggested(null);
              // Retry logic would go here
            }
          )
        ) : userSuggestedGames.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              User Suggested Games
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Games recommended for you
            </Text>
            
            <FlatList
              data={userSuggestedGames}
              renderItem={renderGameItem}
              keyExtractor={(item) => item.id}
              numColumns={5}
              scrollEnabled={false}
              contentContainerStyle={styles.gamesGrid}
              columnWrapperStyle={styles.gamesRow}
            />
          </View>
        ) : null}

        {/* All Games Section */}
        {isLoadingAll ? (
          renderLoadingSection('All Games', 'Explore all available games')
        ) : errorAll ? (
          renderErrorSection(
            'All Games',
            'Explore all available games', 
            errorAll,
            () => {
              setIsLoadingAll(true);
              setErrorAll(null);
              // Retry logic would go here
            }
          )
        ) : allGames.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              All Games
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Explore all available games
            </Text>
            
            <FlatList
              data={allGames}
              renderItem={renderGameItem}
              keyExtractor={(item) => item.id}
              numColumns={5}
              scrollEnabled={false}
              contentContainerStyle={styles.gamesGrid}
              columnWrapperStyle={styles.gamesRow}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>All Games</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>No games available</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 23,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentInfo: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  contentInfoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  gamesGrid: {
    paddingVertical: 8,
  },
  gamesRow: {
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  gameItem: {
    width: '18%',
    alignItems: 'center',
    marginRight: '2.5%', // Add right margin for spacing between items
    position: 'relative',
  },
  gameItemDisabled: {
    opacity: 0.6,
  },
  gameIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  gameIconDisabled: {
    opacity: 0.5,
  },
  gameName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 20,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedIcon: {
    fontSize: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  microphoneLoadingContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  microphoneLoadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  headphoneWarning: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headphoneWarningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headphoneWarningIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headphoneWarningTextContainer: {
    flex: 1,
    maxWidth: 280,
  },
  headphoneWarningText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headphoneWarningSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
  emulatorModeIndicator: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
});
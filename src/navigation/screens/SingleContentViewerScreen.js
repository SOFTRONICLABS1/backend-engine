import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GamePreview } from '../../components/games/GamePreview';
import contentService from '../../api/services/contentService';
import userService from '../../api/services/userService';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { responsivePlatformValue } from '../../utils/responsive';

const { height: screenHeight } = Dimensions.get('window');

// Transform API content to GamePreview format - similar to PublicContentFeed
const transformContentToGameFormat = (apiContent, contentDetails = null, userData = null) => {
  const actualVideoUrl = contentDetails?.download_url || apiContent.download_url || apiContent.media_url;
  const videoUrl = actualVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  
  return {
    id: apiContent.id,
    title: contentDetails?.title || apiContent.title,
    description: contentDetails?.description || apiContent.description || 'Amazing music content! 🎵 #music #create',
    videoUrl: videoUrl,
    thumbnailUrl: `https://picsum.photos/400/800?random=${apiContent.id}`,
    audioUrl: actualVideoUrl || 'https://www.soundjay.com/misc/sounds-human/piano-melody-1.mp3',
    musicNotes: (contentDetails?.notes_data || apiContent.notes_data)?.measures?.[0]?.notes?.map((note, index) => ({
      id: `${apiContent.id}-${index}`,
      note: note.pitch,
      timing: (index + 1) * 500,
      duration: note.duration || 500,
      pitch: getPitchFrequency(note.pitch)
    })) || [
      { id: '1', note: 'C4', timing: 1000, duration: 500, pitch: 261.63 },
      { id: '2', note: 'E4', timing: 1500, duration: 500, pitch: 329.63 },
    ],
    difficulty: (contentDetails?.tags || apiContent.tags)?.includes('hard') ? 'Hard' : 
                (contentDetails?.tags || apiContent.tags)?.includes('easy') ? 'Easy' : 'Medium',
    genre: getGenreFromTags(contentDetails?.tags || apiContent.tags) || 'Music',
    likes: Math.floor(Math.random() * 1000) + 100,
    comments: Math.floor(Math.random() * 100) + 10,
    shares: Math.floor(Math.random() * 50) + 5,
    plays: apiContent.play_count || 0,
    isGameEnabled: true,
    contentId: apiContent.id,
    gameId: apiContent.media_type === 'video' ? 'video-game' : 'audio-game',
    user: {
      id: apiContent.user_id,
      name: userData?.username || 'musiccreator',
      displayName: userData?.signup_username || userData?.username || 'Music Creator',
      avatar: userData?.profile_image_url || 'https://picsum.photos/50/50?random=user1',
    },
    userId: apiContent.user_id,
    tempo: contentDetails?.tempo || apiContent.tempo,
    tags: contentDetails?.tags || apiContent.tags || [],
    created_at: apiContent.created_at
  };
};

// Helper function to get pitch frequency
const getPitchFrequency = (pitch) => {
  const pitchMap = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00,
    'A4': 440.00, 'B4': 493.88, 'C5': 523.25, 'E3': 164.81, 'G3': 196.00, 'B3': 246.94
  };
  return pitchMap[pitch] || 440.00;
};

// Helper function to determine genre from tags
const getGenreFromTags = (tags) => {
  if (!tags) return null;
  const genreMap = {
    rock: 'Rock', pop: 'Pop', classical: 'Classical', jazz: 'Jazz',
    guitar: 'Guitar', piano: 'Piano', vocal: 'Vocal'
  };
  for (const tag of tags) {
    if (genreMap[tag.toLowerCase()]) {
      return genreMap[tag.toLowerCase()];
    }
  }
  return null;
};

export default function SingleContentViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { contentId } = route.params || {};
  
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContentData = async () => {
      if (!contentId) {
        setError('No content ID provided');
        setIsLoading(false);
        return;
      }

      try {
        console.log('===== Fetching single content data for ID:', contentId, '=====');
        
        // Fetch content details and user data in parallel
        const [contentDetails, userDetails] = await Promise.all([
          contentService.getContentDetails(contentId),
          // We'll need to get user_id first, then fetch user details
          contentService.getContentDetails(contentId).then(content => 
            userService.getUserById(content.user_id)
          ).catch(() => null)
        ]);

        console.log('===== Content details:', JSON.stringify(contentDetails, null, 2), '=====');
        console.log('===== User details:', JSON.stringify(userDetails, null, 2), '=====');

        // Transform the content to GamePreview format
        const transformedContent = transformContentToGameFormat(contentDetails, contentDetails, userDetails);
        setContent(transformedContent);
        
      } catch (err) {
        console.error('===== Error fetching content data:', err, '=====');
        setError('Failed to load content');
        Alert.alert('Error', 'Failed to load content details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContentData();
  }, [contentId]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: 'black' }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <View style={styles.loadingContainer}>
          <IconSymbol name="music.note" size={40} color="white" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !content) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: 'black' }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <View style={styles.errorContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const actualHeight = screenHeight;
  const itemHeight = Platform.OS === 'ios' ? actualHeight + 50 : actualHeight + 20;

  return (
    <View style={[styles.container, { 
      marginTop: Platform.OS === 'ios' ? -80 : 0 
    }]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true}
        hidden={false}
      />
      
      {/* Back Button Overlay */}
      <View style={styles.backButtonOverlay}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Single Content Display with adjusted title position */}
      <View style={[styles.contentContainer, { height: itemHeight }]}>
        <View style={styles.gamePreviewWrapper}>
          <GamePreview 
            musicVideoReel={content} 
            navigation={navigation}
            itemHeight={itemHeight}
            showFollowButton={true}
            isScreenFocused={true}
            isCurrentItem={true}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: responsivePlatformValue(60, 80),
    paddingLeft: 20,
  },
  backButtonOverlay: {
    position: 'absolute',
    top: responsivePlatformValue(105, 20),
    left: 9,
    zIndex: 9999,
    elevation: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  gamePreviewWrapper: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 10 : 0,
    marginBottom: Platform.OS === 'android' ? -10 : 0,
  },
});
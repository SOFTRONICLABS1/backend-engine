import React, { useState, useRef, useEffect } from 'react';
import { FlatList, Dimensions, View, StatusBar, Platform, Alert, Text, TouchableOpacity } from 'react-native';
import { GamePreview } from './GamePreview';
import contentService from '../../api/services/contentService';
import userService from '../../api/services/userService';
import { useFocusEffect } from '@react-navigation/native';

// Transform API content to GamePreview format for public content
const transformPublicContentToGameFormat = (apiContent, contentDetails = null, userData = null) => {
  // Use actual video URL from content details if available
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
    likes: Math.floor(Math.random() * 1000) + 100, // Placeholder
    comments: Math.floor(Math.random() * 100) + 10, // Placeholder
    shares: Math.floor(Math.random() * 50) + 5, // Placeholder
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

// Helper function to get pitch frequency (simplified)
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

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const statusBarHeight = Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0;
const actualHeight = screenHeight;

export const PublicContentFeed = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [publicContent, setPublicContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentDetails, setContentDetails] = useState({});
  const [userData, setUserData] = useState({});
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const flatListRef = useRef(null);

  // Fetch content details for a specific content ID
  const fetchContentDetails = async (contentId) => {
    try {
      if (contentDetails[contentId]) {
        return contentDetails[contentId]; // Return cached details
      }
      
      console.log(`===== Fetching content details for ${contentId} =====`);
      const details = await contentService.getContentDetails(contentId);
      console.log('===== Content Details Response:', JSON.stringify(details, null, 2), '=====');
      
      // Cache the content details
      setContentDetails(prev => ({
        ...prev,
        [contentId]: details
      }));
      
      return details;
    } catch (err) {
      console.error(`===== Error fetching content details for ${contentId}:`, err, '=====');
      return null;
    }
  };

  // Fetch user details for a specific user ID
  const fetchUserDetails = async (userId) => {
    try {
      if (userData[userId]) {
        return userData[userId]; // Return cached user data
      }
      
      console.log(`===== Fetching user details for ${userId} =====`);
      const userDetails = await userService.getUserById(userId);
      console.log('===== User Details Response:', JSON.stringify(userDetails, null, 2), '=====');
      
      // Cache the user data
      setUserData(prev => ({
        ...prev,
        [userId]: userDetails
      }));
      
      return userDetails;
    } catch (err) {
      console.error(`===== Error fetching user details for ${userId}:`, err, '=====');
      return null;
    }
  };

  // Handle screen focus/blur
  useFocusEffect(
    React.useCallback(() => {
      console.log('🏠 HomeScreen focused - enabling content playback');
      setIsScreenFocused(true);
      
      return () => {
        console.log('🏠 HomeScreen blurred - disabling content playback');
        setIsScreenFocused(false);
      };
    }, [])
  );

  // Fetch public content from API
  useEffect(() => {
    const fetchPublicContent = async () => {
      try {
        console.log('===== Fetching public content for HomeScreen =====');
        const response = await contentService.getPublicContent(1, 20);
        console.log('===== Public API Response:', JSON.stringify(response, null, 2), '=====');
        
        if (response.contents && response.contents.length > 0) {
          // First, set the basic content without details
          const basicTransformedContent = response.contents.map(content => 
            transformPublicContentToGameFormat(content)
          );
          setPublicContent(basicTransformedContent);
          
          // Then fetch detailed content and user data for each item in the background
          const fetchDetailsPromises = response.contents.map(async (content) => {
            const [details, userDetails] = await Promise.all([
              fetchContentDetails(content.id),
              fetchUserDetails(content.user_id)
            ]);
            return {
              ...content,
              details: details,
              userData: userDetails
            };
          });
          
          Promise.all(fetchDetailsPromises).then((contentsWithDetails) => {
            const transformedContentWithDetails = contentsWithDetails.map(content => 
              transformPublicContentToGameFormat(content, content.details, content.userData)
            );
            setPublicContent(transformedContentWithDetails);
          });
          
        } else {
          setPublicContent([]);
        }
      } catch (err) {
        console.error('===== Error fetching public content:', err, '=====');
        setError('Failed to load content');
        Alert.alert('Error', 'Failed to load public content');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPublicContent();
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index || 0;
      const previousIndex = currentIndex;
      
      console.log('📹 Video scroll - changing from index', previousIndex, 'to', newIndex);
      setCurrentIndex(newIndex);
      
      // Log the content that's now visible
      if (publicContent[newIndex]) {
        console.log('🎬 Now viewing:', publicContent[newIndex].title);
        console.log('🎵 Video URL:', publicContent[newIndex].videoUrl);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const itemHeight = actualHeight - (Platform.OS === 'ios' ? 100 : 80);
  
  const getItemLayout = (_, index) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  });

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true} 
      />
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 18 }}>Loading public content...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>{error}</Text>
          <TouchableOpacity 
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => window.location.reload()}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : publicContent.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>No public content available</Text>
          <TouchableOpacity 
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => window.location.reload()}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={publicContent}
          renderItem={({ item, index }) => (
            <View style={{ height: itemHeight }}>
              <GamePreview 
                musicVideoReel={item} 
                navigation={navigation}
                itemHeight={itemHeight}
                showFollowButton={true}
                isScreenFocused={isScreenFocused}
                isCurrentItem={index === currentIndex}
              />
            </View>
          )}
          keyExtractor={(item) => item.id}
          pagingEnabled={true}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={1}
          windowSize={2}
          initialScrollIndex={currentIndex}
          bounces={false}
        />
      )}
    </View>
  );
};
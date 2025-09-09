import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Share,
  Alert,
  Image,
  StatusBar,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import contentService from '../../api/services/contentService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PostDetailScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { contentId } = route.params || {};
  
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const loadContent = async () => {
      if (!contentId) {
        setError('Content ID not provided');
        setIsLoading(false);
        return;
      }
      
      try {
        console.log('===== Loading content details for ID:', contentId, '===');
        const data = await contentService.getContentDetails(contentId);
        console.log('===== Content loaded successfully:', data, '===');
        setContent(data);
        setError(null);
      } catch (err) {
        console.error('===== Error loading content:', err, '===');
        setError('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadContent();
  }, [contentId]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !content) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Content not found'}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isVideo = content.media_type === 'video';
  const mediaUrl = content.media_url;

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    Alert.alert(
      'Play Content',
      `Playing: ${content.title}`,
      [{ text: 'OK' }]
    );
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this ${isVideo ? 'video' : 'audio'}: ${content.title}\n\n${content.description}`,
        title: content.title,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleComment = () => {
    Alert.alert('Comments', `Comments for: ${content.title}`);
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'video': return '📹';
      case 'audio': return '🎵';
      case 'lesson': return '📚';
      case 'tutorial': return '🎓';
      default: return '🎼';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backIcon, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Content</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      
      {/* Full Screen Content Container */}
      <View style={styles.fullScreenContainer}>
        {/* Full Screen Video Background */}
        <View style={styles.videoContainer}>
          <Image 
            source={{ uri: `https://picsum.photos/400/600?random=${content.id}` }}
            style={styles.videoBackground}
            resizeMode="cover"
          />
          
          {/* Central Play Button */}
          <TouchableOpacity 
            style={styles.centralPlayButton}
            onPress={handlePlayPause}
          >
            <View style={[styles.playButtonCircle, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
              <IconSymbol name="play.fill" size={32} color={theme.primary} />
            </View>
          </TouchableOpacity>
          
          {/* Top Right Info Overlay */}
          <View style={styles.topRightOverlay}>
            <Text style={styles.contentTypeEmoji}>{getContentIcon(content.media_type || 'audio')}</Text>
            <Text style={styles.durationText}>{content.tempo ? `${content.tempo} BPM` : '3:45'}</Text>
          </View>
        </View>

        {/* Right Side Action Buttons */}
        <View style={styles.rightSideActions}>
          <TouchableOpacity 
            style={styles.sideActionButton} 
            onPress={toggleLike}
          >
            <Text style={styles.sideActionIcon}>
              {isLiked ? '❤️' : '🤍'}
            </Text>
            <Text style={[styles.sideActionLabel, { color: 'white' }]}>
              {content.play_count > 1000 ? `${(content.play_count/1000).toFixed(1)}K` : content.play_count || 234}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.sideActionButton} 
            onPress={handleComment}
          >
            <Text style={styles.sideActionIcon}>💬</Text>
            <Text style={[styles.sideActionLabel, { color: 'white' }]}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.sideActionButton} 
            onPress={handleShare}
          >
            <Text style={styles.sideActionIcon}>📤</Text>
            <Text style={[styles.sideActionLabel, { color: 'white' }]}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sideActionButton} 
            onPress={toggleBookmark}
          >
            <Text style={styles.sideActionIcon}>
              {isBookmarked ? '🔖' : '📑'}
            </Text>
            <Text style={[styles.sideActionLabel, { color: 'white' }]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info Section */}
        <View style={styles.bottomInfoSection}>
          {/* User Info Row */}
          <View style={styles.bottomUserRow}>
            <TouchableOpacity 
              style={styles.userProfileSection}
              onPress={() => navigation.navigate('ProfileScreen')}
            >
              <Image 
                source={{ uri: 'https://picsum.photos/50/50?random=user1' }} 
                style={styles.bottomUserAvatar} 
              />
              <View style={styles.bottomUserInfo}>
                <Text style={[styles.bottomUsername, { color: 'white' }]}>@musiccreator</Text>
                <Text style={[styles.bottomUserTitle, { color: 'rgba(255,255,255,0.8)' }]}>
                  {content.title}
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.bottomFollowButton, 
                { 
                  backgroundColor: isFollowing ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)',
                  borderColor: 'rgba(255,255,255,0.5)',
                  borderWidth: 1
                }
              ]}
              onPress={toggleFollow}
            >
              <Text style={[
                styles.bottomFollowText, 
                { color: isFollowing ? 'white' : theme.primary }
              ]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Caption */}
          <Text style={[styles.bottomCaption, { color: 'white' }]}>
            {content.description || 'Amazing music content! 🎵 #music #create'}
          </Text>
          
          {/* Content Type Badge */}
          <View style={styles.contentTypeBadge}>
            <Text style={[styles.contentTypeBadgeText, { color: theme.primary }]}>
              {content.media_type ? content.media_type.toUpperCase() : 'AUDIO'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerPlaceholder: {
    width: 24,
  },
  fullScreenContainer: {
    height: screenHeight - 100,
    position: 'relative',
    backgroundColor: 'black',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoBackground: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  centralPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  playButtonCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  topRightOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  contentTypeEmoji: {
    fontSize: 16,
  },
  durationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  rightSideActions: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    alignItems: 'center',
    gap: 20,
  },
  sideActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideActionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  sideActionLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bottomInfoSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 80,
    padding: 16,
    backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
  },
  bottomUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bottomUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  bottomUserInfo: {
    flex: 1,
  },
  bottomUsername: {
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bottomUserTitle: {
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bottomFollowButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bottomFollowText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomCaption: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  contentTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  contentTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
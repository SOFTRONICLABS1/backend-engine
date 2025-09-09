import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Alert,
  Image,
  ScrollView,
  FlatList,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { GamePreview } from '../../components/games/GamePreview';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ContentViewerScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { posts = [], initialIndex = 0, singleContent = false } = route.params || {};
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState(new Set());
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const flatListRef = useRef(null);

  if (!posts || posts.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>Content not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If single content, just show that one content using GamePreview
  if (singleContent) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar hidden />
        <GamePreview 
          musicVideoReel={posts[0]} 
          navigation={navigation} 
          showFollowButton={true}
          isScreenFocused={true}
          isCurrentItem={true}
        />
      </View>
    );
  }

  const handlePlayContent = (post) => {
    Alert.alert(
      'Play Content',
      `Playing: ${post.title}`,
      [{ text: 'OK' }]
    );
  };

  const toggleLike = (postId) => {
    const newLiked = new Set(likedPosts);
    if (newLiked.has(postId)) {
      newLiked.delete(postId);
    } else {
      newLiked.add(postId);
    }
    setLikedPosts(newLiked);
  };

  const toggleBookmark = (postId) => {
    const newBookmarked = new Set(bookmarkedPosts);
    if (newBookmarked.has(postId)) {
      newBookmarked.delete(postId);
    } else {
      newBookmarked.add(postId);
    }
    setBookmarkedPosts(newBookmarked);
  };

  const toggleFollow = (userId) => {
    const newFollowing = new Set(followingUsers);
    if (newFollowing.has(userId)) {
      newFollowing.delete(userId);
    } else {
      newFollowing.add(userId);
    }
    setFollowingUsers(newFollowing);
  };

  const handleShare = (post) => {
    Alert.alert('Share', `Sharing: ${post.title}`);
  };

  const handleComment = (post) => {
    Alert.alert('Comments', `Comments for: ${post.title}`);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  // Helper function to get content icon - exact copy from ExploreScreen
  const getContentIcon = (type) => {
    switch (type) {
      case 'video': return '📹';
      case 'audio': return '🎵';
      case 'lesson': return '📚';
      case 'tutorial': return '🎓';
      default: return '🎼';
    }
  };

  const renderPost = ({ item: post, index }) => {
    const isLiked = likedPosts.has(post.id);
    const isFollowing = followingUsers.has('user1'); // Mock user ID
    
    return (
      <View style={styles.fullScreenContainer}>
        {/* Full Screen Video Background */}
        <View style={styles.videoContainer}>
          <Image 
            source={{ uri: `https://picsum.photos/400/600?random=${post.id}` }} 
            style={styles.videoBackground} 
          />
          
          {/* Central Play Button */}
          <TouchableOpacity 
            style={styles.centralPlayButton}
            onPress={() => handlePlayContent(post)}
          >
            <View style={[styles.playButtonCircle, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
              <IconSymbol name="play.fill" size={32} color={theme.primary} />
            </View>
          </TouchableOpacity>
          
          {/* Top Right Info Overlay */}
          <View style={styles.topRightOverlay}>
            <Text style={styles.contentTypeEmoji}>{getContentIcon(post.media_type || post.type || 'audio')}</Text>
            <Text style={styles.durationText}>{post.tempo ? `${post.tempo} BPM` : '3:45'}</Text>
          </View>
        </View>

        {/* Right Side Action Buttons */}
        <View style={styles.rightSideActions}>
          <TouchableOpacity 
            style={styles.sideActionButton} 
            onPress={() => toggleLike(post.id)}
          >
            <Text style={styles.sideActionIcon}>
              {isLiked ? '❤️' : '🤍'}
            </Text>
            <Text style={[styles.sideActionLabel, { color: theme.text }]}>
              {post.play_count > 1000 ? `${(post.play_count/1000).toFixed(1)}K` : post.play_count || post.likes || 234}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.sideActionButton} 
            onPress={() => handleComment(post)}
          >
            <Text style={styles.sideActionIcon}>💬</Text>
            <Text style={[styles.sideActionLabel, { color: theme.text }]}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.sideActionButton} 
            onPress={() => handleShare(post)}
          >
            <Text style={styles.sideActionIcon}>📤</Text>
            <Text style={[styles.sideActionLabel, { color: theme.text }]}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sideActionButton} 
            onPress={() => toggleBookmark(post.id)}
          >
            <Text style={styles.sideActionIcon}>
              {bookmarkedPosts.has(post.id) ? '🔖' : '📑'}
            </Text>
            <Text style={[styles.sideActionLabel, { color: theme.text }]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info Section */}
        <View style={styles.bottomInfoSection}>
          {/* User Info Row */}
          <View style={styles.bottomUserRow}>
            <TouchableOpacity 
              style={styles.userProfileSection}
              onPress={() => navigation.navigate('ProfileScreen', { userId: 'user1' })}
            >
              <Image source={{ uri: userAvatar }} style={styles.bottomUserAvatar} />
              <View style={styles.bottomUserInfo}>
                <Text style={[styles.bottomUsername, { color: 'white' }]}>@{username}</Text>
                <Text style={[styles.bottomUserTitle, { color: 'rgba(255,255,255,0.8)' }]}>
                  {post.title}
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
              onPress={() => toggleFollow('user1')}
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
            {post.description || 'Amazing music content! 🎵 #music #create'}
          </Text>
          
          {/* Content Type Badge */}
          <View style={styles.contentTypeBadge}>
            <Text style={[styles.contentTypeBadgeText, { color: theme.primary }]}>
              {post.media_type ? post.media_type.toUpperCase() : post.type ? post.type.toUpperCase() : 'AUDIO'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backIcon, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Content</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Vertical Swipeable Posts */}
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={screenHeight - 100} // Account for header
        snapToAlignment="start"
        decelerationRate="fast"
        vertical
        initialScrollIndex={initialIndex}
        getItemLayout={(data, index) => ({
          length: screenHeight - 100,
          offset: (screenHeight - 100) * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50
        }}
        contentContainerStyle={styles.listContainer}
      />
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
  listContainer: {
    paddingBottom: 20,
  },
  fullScreenContainer: {
    height: screenHeight - 100, // Account for header
    position: 'relative',
    backgroundColor: 'black',
  },
  // Full Screen Video Container
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
  // Central Play Button
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
  // Top Right Info Overlay
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
  // Right Side Action Buttons (TikTok Style)
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
  // Bottom Info Section (TikTok Style)
  bottomInfoSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 80, // Leave space for right side actions
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
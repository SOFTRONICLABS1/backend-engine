import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Video from 'react-native-video';
import { IconSymbol } from './ui/IconSymbol';
import { useTheme } from '../theme/ThemeContext';
import contentService from '../api/services/contentService';
import gamesService from '../api/services/gamesService';

// Import local game thumbnails
const gameThumbnails = {
  flappy: require('../../assets/thumbnails/flappy.png'),
  tune: require('../../assets/thumbnails/tune.jpg'),
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

const { width: screenWidth } = Dimensions.get('window');

// Sample posts data
const samplePosts = [
  {
    id: '1',
    type: 'audio',
    thumbnail: 'https://picsum.photos/200/200?random=11',
    title: 'Piano Cover - Shape of You',
    duration: '3:45',
    likes: 234,
    plays: 1250,
  },
  {
    id: '2',
    type: 'video',
    thumbnail: 'https://picsum.photos/200/200?random=12',
    title: 'Guitar Tutorial - Wonderwall',
    duration: '5:20',
    likes: 156,
    plays: 890,
  },
  {
    id: '3',
    type: 'audio',
    thumbnail: 'https://picsum.photos/200/200?random=13',
    title: 'Vocal Training Session',
    duration: '2:15',
    likes: 89,
    plays: 456,
  },
  {
    id: '4',
    type: 'video',
    thumbnail: 'https://picsum.photos/200/200?random=14',
    title: 'Beat Making Process',
    duration: '8:30',
    likes: 345,
    plays: 2100,
  },
  {
    id: '5',
    type: 'audio',
    thumbnail: 'https://picsum.photos/200/200?random=15',
    title: 'Jazz Improvisation',
    duration: '4:12',
    likes: 167,
    plays: 780,
  },
  {
    id: '6',
    type: 'video',
    thumbnail: 'https://picsum.photos/200/200?random=16',
    title: 'Studio Session Behind Scenes',
    duration: '6:45',
    likes: 289,
    plays: 1456,
  },
];

export default function ProfileTabs({ playlists, onCreatePress, onPostPress, onPlaylistPress, onGamePress, onTabChange }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [postsRefreshing, setPostsRefreshing] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  
  const itemWidth = (screenWidth - 80) / 3; // 3 columns with more buffer to account for gaps

  // Calculate time since last played
  const calculateTimeSinceLastPlayed = (lastPlayedTime) => {
    try {
      const lastPlayed = new Date(lastPlayedTime);
      const now = new Date();
      const diffInMs = now.getTime() - lastPlayed.getTime();
      
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 60) {
        return diffInMinutes <= 1 ? '1 min ago' : `${diffInMinutes} mins ago`;
      } else if (diffInHours < 24) {
        return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
      } else {
        return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
      }
    } catch (error) {
      console.error('Error calculating time since last played:', error);
      return 'Recently';
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    onTabChange && onTabChange(tab);
  };

  // Fetch posts from API
  const fetchPosts = async (pageNum = 1, reset = false) => {
    if (postsLoading && !reset) return;

    try {
      setPostsLoading(true);
      const response = await contentService.getMyContent(pageNum, 20);
      console.log('📱 ProfileTabs - Content API Response:', JSON.stringify(response, null, 2));
      
      if (response.contents && response.contents.length > 0) {
        console.log('📷 Sample content item structure:', JSON.stringify(response.contents[0], null, 2));
        console.log('📋 ProfileTabs - Fetching content details for all posts before displaying...');
        
        // Fetch detailed content for each item first to get download URLs
        const fetchDetailsPromises = response.contents.map(async (content) => {
          try {
            const details = await contentService.getContentDetails(content.id);
            return {
              ...content,
              download_url: details?.download_url || content.download_url,
              details: details
            };
          } catch (error) {
            console.log(`Error fetching details for content ${content.id}:`, error);
            // Return content without details if API call fails
            return content;
          }
        });
        
        const contentsWithDetails = await Promise.all(fetchDetailsPromises);
        console.log('📋 ProfileTabs - All content details fetched, now displaying posts');
        
        if (reset) {
          setPosts(contentsWithDetails);
          setPostsPage(1);
        } else {
          setPosts(prev => [...prev, ...contentsWithDetails]);
        }
        setPostsTotalPages(response.total_pages || 1);
        setPostsPage(pageNum);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      Alert.alert('Error', 'Failed to load posts. Please try again.');
    } finally {
      setPostsLoading(false);
      setPostsRefreshing(false);
    }
  };

  // Fetch posts when component mounts
  useEffect(() => {
    console.log('🔄 ProfileTabs mounting - fetching posts...');
    fetchPosts(1, true);
  }, []);

  // Fetch games when component mounts or games tab is selected
  useEffect(() => {
    if (activeTab === 'games') {
      console.log('🎮 ProfileTabs - Games tab selected, fetching recent games...');
      fetchRecentGames();
    }
  }, [activeTab]);

  // Also fetch games on initial mount
  useEffect(() => {
    console.log('🔄 ProfileTabs mounting - fetching recent games...');
    fetchRecentGames();
  }, []);

  const handlePostsRefresh = () => {
    setPostsRefreshing(true);
    fetchPosts(1, true);
  };

  const handlePostsLoadMore = () => {
    if (!postsLoading && postsPage < postsTotalPages) {
      fetchPosts(postsPage + 1);
    }
  };

  // Fetch recent games from API
  const fetchRecentGames = async () => {
    if (gamesLoading) return;

    try {
      setGamesLoading(true);
      setGamesError(null);
      
      console.log('=================== Fetching Recent Games for Profile ===================');
      
      const gamesWithDetails = await gamesService.getRecentGamesWithDetails();
      
      // Transform the API response to match our UI structure
      const transformedGames = gamesWithDetails.map((game, index) => ({
        id: game.game_id,
        title: game.game_name,
        description: game.contentDetails?.title || game.content_name || 'Game Content',
        icon: `https://picsum.photos/80/80?random=game${index + 1}`, // Placeholder icon
        lastPlayed: game.timeSinceLastPlayed,
        score: game.score,
        rank: index + 1, // Simple ranking based on order
        contentId: game.content_id,
        contentDetails: game.contentDetails,
      }));

      setRecentGames(transformedGames);
      
      console.log('✅ Recent games fetched and transformed successfully');
      console.log('=================== Recent Games Fetched ===================');
      
    } catch (error) {
      console.error('Error fetching recent games:', error);
      setGamesError(error.message || 'Failed to load recent games');
      
      // Show empty state on error
      setRecentGames([]);
    } finally {
      setGamesLoading(false);
    }
  };

  const renderPost = ({ item, index }) => {
    const isVideo = item.media_type === 'video' || item.content_type === 'video';
    const playCount = item.play_count || 0;
    
    // Only show content if download_url is available from API - no placeholder fallbacks
    if (!item.download_url) {
      return (
        <View style={[styles.gridItem, styles.loadingPostItem, { width: itemWidth, height: itemWidth, backgroundColor: theme.surface }]}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      );
    }
    
    return (
      <TouchableOpacity
        style={[styles.gridItem, { width: itemWidth, height: itemWidth }]}
        onPress={async () => {
          console.log(`===== Clicked on content id: ${item.id} ========`);
          console.log('API:');
          
          try {
            const contentDetails = await contentService.getContentDetails(item.id);
            console.log('response:');
            console.log(JSON.stringify(contentDetails, null, 2));
          } catch (error) {
            console.log('API Error:');
            console.log(JSON.stringify(error.response?.data || error.message, null, 2));
          }
          
          onPostPress && onPostPress(item, posts);
        }}
      >
        {/* Use actual content as thumbnail with video support */}
        <View style={[styles.postThumbnail, { backgroundColor: theme.surface }]}>
          {isVideo ? (
            <Video
              source={{ uri: item.download_url }}
              style={styles.thumbnailImage}
              resizeMode="cover"
              paused={true}
              muted={true}
              onError={(error) => {
                console.log('Video thumbnail error for:', item.download_url);
              }}
              onLoadStart={() => console.log('Loading video thumbnail from:', item.download_url)}
            />
          ) : (
            <Image 
              source={{ uri: item.download_url }} 
              style={styles.thumbnailImage}
              onError={(error) => {
                console.log('Image thumbnail load error for:', item.download_url);
              }}
              onLoadStart={() => console.log('Loading image thumbnail from:', item.download_url)}
              resizeMode="cover"
            />
          )}
          
          {/* Large content type overlay */}
          <View style={styles.contentTypeOverlay}>
            <Text style={styles.contentTypeIcon}>
              {isVideo ? '🎬' : '🎵'}
            </Text>
          </View>
        </View>
        
        {/* Content Type Indicator */}
        <View style={styles.typeIndicator}>
          <Text style={styles.typeIndicatorText}>
            {isVideo ? '▶' : '♪'}
          </Text>
        </View>
        
        {/* Tempo Badge (instead of duration for music content) */}
        {item.tempo && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.tempo} BPM</Text>
          </View>
        )}

        {/* Play Count Indicator */}
        <View style={styles.playCountIndicator}>
          <Text style={styles.playIconText}>▶</Text>
          <Text style={styles.playCountText}>
            {playCount > 1000 ? `${(playCount/1000).toFixed(1)}K` : playCount}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPlaylist = ({ item, index }) => {
    return (
      <TouchableOpacity
        style={[styles.playlistCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => onPlaylistPress && onPlaylistPress(item)}
      >
        <View style={styles.playlistCardContent}>
          <View style={styles.playlistImageContainer}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.playlistThumbnail} />
            ) : (
              <View style={[styles.playlistThumbnailPlaceholder, { backgroundColor: theme.surfacePlus || theme.border }]}>
                <Text style={[styles.playlistPlaceholderIcon, { color: theme.primary }]}>♪</Text>
              </View>
            )}
            <View style={[styles.playOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <Text style={styles.playOverlayIcon}>▶</Text>
            </View>
          </View>
          
          <View style={styles.playlistInfo}>
            <Text style={[styles.playlistName, { color: theme.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.playlistDescription, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={[styles.playlistTrackCount, { color: theme.textTertiary || theme.textSecondary }]}>
              {item.trackCount} tracks
            </Text>
          </View>

          <TouchableOpacity style={styles.playlistMenuButton}>
            <Text style={[styles.menuIcon, { color: theme.textTertiary || theme.textSecondary }]}>⋯</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGame = ({ item, index }) => {
    return (
      <TouchableOpacity
        style={[styles.gameCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => onGamePress && onGamePress(item)}
      >
        <View style={styles.gameCardContent}>
          <View style={styles.gameImageContainer}>
            <Image source={getGameThumbnail(item.title) || { uri: item.icon || `https://picsum.photos/60/60?random=${item.id}` }} style={styles.gameIcon} />
            <View style={[styles.rankBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.rankText}>#{item.rank}</Text>
            </View>
          </View>
          
          <View style={styles.gameInfo}>
            <Text style={[styles.gameTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.gameDescription, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={styles.gameStats}>
              <Text style={[styles.gameScore, { color: theme.primary }]}>
                {item.score} pts
              </Text>
              <Text style={[styles.gameLastPlayed, { color: theme.textTertiary || theme.textSecondary }]}>
                {item.lastPlayed}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.playGameButton}>
            <Text style={[styles.playGameIcon, { color: theme.primary }]}>🎮</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'posts') {
      return (
        <FlatList
          key="posts-grid" // Force refresh when switching tabs
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          numColumns={3}
          scrollEnabled={false}
          nestedScrollEnabled={false}
          contentContainerStyle={styles.gridContainer}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          columnWrapperStyle={styles.row}
          onRefresh={handlePostsRefresh}
          refreshing={postsRefreshing}
          onEndReached={handlePostsLoadMore}
          onEndReachedThreshold={0.5}
        />
      );
    } else if (activeTab === 'playlists') {
      return (
        <FlatList
          key="playlists-list" // Force refresh when switching tabs
          data={playlists}
          renderItem={renderPlaylist}
          keyExtractor={(item) => item.id}
          numColumns={1}
          scrollEnabled={false}
          nestedScrollEnabled={false}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      );
    } else if (activeTab === 'games') {
      if (gamesLoading && recentGames.length === 0) {
        return (
          <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading recent games...
            </Text>
          </View>
        );
      }

      if (gamesError && recentGames.length === 0) {
        return (
          <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>
              {gamesError}
            </Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={fetchRecentGames}
            >
              <Text style={[styles.retryButtonText, { color: 'white' }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <FlatList
          key="games-list" // Force refresh when switching tabs
          data={recentGames}
          renderItem={renderGame}
          keyExtractor={(item) => item.id}
          numColumns={1}
          scrollEnabled={false}
          nestedScrollEnabled={false}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          onRefresh={fetchRecentGames}
          refreshing={gamesLoading}
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={[styles.tabHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'games' && styles.activeTab]}
          onPress={() => handleTabChange('games')}
        >
          <View style={styles.tabContent}>
            <View style={styles.tabRow}>
              <Text style={[
                styles.tabIcon, 
                { color: activeTab === 'games' ? theme.text : theme.textSecondary }
              ]}>
                🎮
              </Text>
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'games' ? theme.text : theme.textSecondary }
              ]}>
                Games
              </Text>
            </View>
            <View style={[
              styles.tabUnderline, 
              { 
                backgroundColor: activeTab === 'games' ? theme.primary : 'transparent'
              }
            ]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => handleTabChange('posts')}
        >
          <View style={styles.tabContent}>
            <View style={styles.tabRow}>
              <Text style={[
                styles.tabIcon, 
                { color: activeTab === 'posts' ? theme.text : theme.textSecondary }
              ]}>
                ⊞
              </Text>
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'posts' ? theme.text : theme.textSecondary }
              ]}>
                Posts
              </Text>
            </View>
            <View style={[
              styles.tabUnderline, 
              { 
                backgroundColor: activeTab === 'posts' ? theme.primary : 'transparent'
              }
            ]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'playlists' && styles.activeTab]}
          onPress={() => handleTabChange('playlists')}
        >
          <View style={styles.tabContent}>
            <View style={styles.tabRow}>
              <Text style={[
                styles.tabIcon, 
                { color: activeTab === 'playlists' ? theme.text : theme.textSecondary }
              ]}>
                ♫
              </Text>
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'playlists' ? theme.text : theme.textSecondary }
              ]}>
                Playlists
              </Text>
            </View>
            <View style={[
              styles.tabUnderline, 
              { 
                backgroundColor: activeTab === 'playlists' ? theme.primary : 'transparent'
              }
            ]} />
          </View>
        </TouchableOpacity>

      </View>


      {/* Tab Content */}
      <View style={styles.tabContentArea}>
        {activeTab === 'posts' && postsLoading && posts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading posts...</Text>
          </View>
        ) : (
          renderTabContent()
        )}
        
        {/* Empty State */}
        {((activeTab === 'posts' && posts.length === 0 && !postsLoading) || 
          (activeTab === 'playlists' && playlists.length === 0) ||
          (activeTab === 'games' && recentGames.length === 0)) && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateIcon, { color: theme.textTertiary || theme.textSecondary }]}>
              {activeTab === 'posts' ? '📷' : activeTab === 'playlists' ? '🎵' : '🎮'}
            </Text>
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
              No {activeTab === 'posts' ? 'posts' : activeTab === 'playlists' ? 'playlists' : 'games played'} yet
            </Text>
            <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
              {activeTab === 'posts' 
                ? 'Share your music content to get started'
                : activeTab === 'playlists' 
                ? 'Create your first playlist'
                : 'Start playing games to see your history'
              }
            </Text>
            {activeTab !== 'games' && (
              <TouchableOpacity
                style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
                onPress={onCreatePress}
              >
                <Text style={styles.emptyStateButtonText}>
                  Create {activeTab === 'posts' ? 'Post' : 'Playlist'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    position: 'relative',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeTab: {
    opacity: 1,
  },
  tabIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabUnderline: {
    height: 2,
    width: '100%',
    marginTop: 4,
    borderRadius: 1,
  },
  tabContentArea: {
    flex: 1,
    paddingTop: 4,
  },
  gridContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  row: {
    justifyContent: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  gridItem: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 5,
  },
  postThumbnail: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentTypeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentTypeIcon: {
    fontSize: 32,
    opacity: 0.8,
  },
  playlistPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  playCountIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  playCountText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Text Icon Styles
  typeIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  playIconText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  playlistPlaceholderIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  playOverlayIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateIcon: {
    fontSize: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  loadingPostItem: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Playlist Card Styles
  playlistCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  playlistCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  playlistThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  playlistThumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  playlistInfo: {
    flex: 1,
    marginRight: 8,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  playlistDescription: {
    fontSize: 13,
    marginBottom: 2,
  },
  playlistTrackCount: {
    fontSize: 11,
  },
  playlistMenuButton: {
    padding: 8,
  },
  // Game Card Styles
  gameCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  gameCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  gameIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  rankBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  rankText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gameInfo: {
    flex: 1,
    marginRight: 12,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 13,
    marginBottom: 8,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  gameLastPlayed: {
    fontSize: 12,
  },
  playGameButton: {
    padding: 8,
  },
  playGameIcon: {
    fontSize: 20,
  },
});
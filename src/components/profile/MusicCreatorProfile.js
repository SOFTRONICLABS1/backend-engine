import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, ScrollView, SafeAreaView, Modal, Alert, Dimensions, FlatList } from 'react-native';
import { IconSymbol } from '../ui/IconSymbol';
import { useTheme } from '../../theme/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

export default function MusicCreatorProfile({ 
  creatorName, 
  avatar,
  followers,
  following,
  bio,
  featuredTracks = [],
  playlists = [],
  userPosts = [],
  onFollowToggle,
  onMessage,
  navigation
}) {
  const { theme } = useTheme();
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  const safePlaylist = playlists || [];
  const safeFeaturedTracks = featuredTracks || [];
  const itemWidth = (screenWidth - 80) / 3; // 3 columns with buffer - same as ProfileTabs
  
  const userData = {
    username: creatorName || 'Unknown User',
    avatar,
    bio: bio || 'Music creator and content maker',
    followers: followers || 0,
    following: following || 0,
    totalPlaylists: safePlaylist.length,
    totalPlays: safePlaylist.reduce((total, playlist) => {
      return total + (playlist.trackCount || 0) * 1000;
    }, 0),
    playlists: safePlaylist,
    featuredTracks: safeFeaturedTracks
  };

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    onFollowToggle?.();
  };

  const handleMessagePress = () => {
    onMessage?.();
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Hard': return '#F44336';
      case 'Expert': return '#9C27B0';
      default: return '#666666';
    }
  };

  const handlePlaylistPress = (playlist) => {
    setSelectedPlaylist(playlist);
    setShowPlaylistModal(true);
  };

  const handlePlayFeaturedTrack = (trackTitle) => {
    Alert.alert('Playing Track', trackTitle);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  const renderPost = ({ item, index }) => {
    const isVideo = item.mediaType === 'video';
    const playCount = item.plays || 0;
    
    return (
      <TouchableOpacity
        style={[styles.gridItem, { width: itemWidth, height: itemWidth }]}
        onPress={() => {
          console.log('Open post:', item.id);
        }}
      >
        <View style={[styles.postThumbnail]}>
          <Image 
            source={{ uri: item.thumbnailUrl || `https://picsum.photos/300/300?random=${index}` }} 
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
          
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <IconSymbol name="arrow.left" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: theme.surface }]}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surfacePlus }]}>
                  <IconSymbol name="person.fill" size={40} color={theme.textSecondary} />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.fullName, { color: theme.text }]}>{userData.username}</Text>
              </View>
              <Text style={[styles.email, { color: theme.textSecondary }]}>@{userData.username}</Text>
              
              {/* Follow/Message Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[
                    styles.followButton, 
                    { 
                      backgroundColor: isFollowing ? theme.surface : theme.primary,
                      borderColor: theme.primary,
                      borderWidth: isFollowing ? 1 : 0
                    }
                  ]} 
                  onPress={handleFollowToggle}
                >
                  <Text style={[
                    styles.followButtonText, 
                    { color: isFollowing ? theme.primary : 'white' }
                  ]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                
                {isFollowing && (
                  <TouchableOpacity 
                    style={[styles.messageButton, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                    onPress={handleMessagePress}
                  >
                    <IconSymbol name="message" size={16} color={theme.text} />
                    <Text style={[styles.messageButtonText, { color: theme.text }]}>Message</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <Text style={[styles.bio, { color: theme.textSecondary }]}>{userData.bio}</Text>

          {/* Social Stats */}
          <View style={[styles.statsContainer, { borderTopColor: theme.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{userData.followers.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{userData.following.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Following</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{userData.totalPlaylists}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Playlists</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{(userData.totalPlays / 1000).toFixed(0)}K</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Plays</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabNavigation, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
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
              {activeTab === 'posts' && (
                <View style={[styles.tabUnderline, { backgroundColor: theme.primary }]} />
              )}
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
              {activeTab === 'playlists' && (
                <View style={[styles.tabUnderline, { backgroundColor: theme.primary }]} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'posts' ? (
            <View style={styles.listContainer}>
              {userPosts && userPosts.length > 0 ? (
                <FlatList
                  data={userPosts}
                  renderItem={renderPost}
                  numColumns={3}
                  keyExtractor={(item, index) => item.id || index.toString()}
                  contentContainerStyle={styles.row}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>⊞</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No posts yet</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {userData.playlists && userData.playlists.length > 0 ? userData.playlists.map((playlist) => (
                <TouchableOpacity 
                  key={playlist.id}
                  style={[styles.playlistCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => handlePlaylistPress(playlist)}
                >
                  <View style={styles.playlistCardContent}>
                    <View style={styles.playlistImageContainer}>
                      {playlist.thumbnail ? (
                        <Image source={{ uri: playlist.thumbnail }} style={styles.playlistThumbnail} />
                      ) : (
                        <View style={[styles.playlistThumbnailPlaceholder, { backgroundColor: theme.surfacePlus }]}>
                          <IconSymbol name="music.note" size={24} color={theme.primary} />
                        </View>
                      )}
                      <View style={[styles.playOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <IconSymbol name="play.circle.fill" size={20} color="white" />
                      </View>
                    </View>
                    
                    <View style={styles.playlistInfo}>
                      <Text style={[styles.playlistName, { color: theme.text }]} numberOfLines={2}>
                        {playlist.title}
                      </Text>
                      <Text style={[styles.playlistDescription, { color: theme.textSecondary }]} numberOfLines={1}>
                        {playlist.description}
                      </Text>
                      <Text style={[styles.playlistTrackCount, { color: theme.textTertiary }]}>
                        {playlist.trackCount} tracks
                      </Text>
                    </View>

                    <TouchableOpacity style={styles.playlistMenuButton}>
                      <IconSymbol name="ellipsis" size={16} color={theme.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>♫</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No playlists yet</Text>
                </View>
              )}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
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
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
  },
  profileSection: {
    padding: 20,
    marginBottom: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
    marginTop: 8,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    marginBottom: 4,
  },
  buttonContainer: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  followButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  featuredSection: {
    padding: 20,
    paddingBottom: 12,
  },
  tracksScroll: {
    paddingRight: 20,
  },
  trackCard: {
    width: 140,
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
  },
  trackIconContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  trackIcon: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    minHeight: 60,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackPlays: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  trackStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trackStatText: {
    fontSize: 10,
  },
  playlistsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  playlistCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  // Tab Navigation Styles
  tabNavigation: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
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
  tabIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -12,
    left: 0,
    right: 0,
    height: 2,
  },
  // Tab Content Styles - Matching ProfileTabs exactly
  tabContentContainer: {
    flex: 1,
    minHeight: 300,
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
  typeIndicatorText: {
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
  playIconText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '600',
  },
  playCountText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
});
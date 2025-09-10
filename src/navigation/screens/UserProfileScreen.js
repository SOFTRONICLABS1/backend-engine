import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MusicCreatorProfile from '../../components/profile/MusicCreatorProfile';
import userService from '../../api/services/userService';
import contentService from '../../api/services/contentService';
import { AppColors } from '../../theme/Colors';

const mockPlaylists = [
  {
    id: '1',
    title: 'Chill Gaming Vibes',
    description: 'Perfect background music for gaming sessions',
    thumbnail: 'https://picsum.photos/200/200?random=1',
    trackCount: 25,
    totalDuration: '1h 45m',
    tracks: [
      { id: '1', title: 'Neon Nights', duration: '3:45', plays: 12500 },
      { id: '2', title: 'Digital Dreams', duration: '4:12', plays: 8900 },
    ],
  },
  {
    id: '2',
    title: 'Electronic Beats',
    description: 'High-energy electronic music for intense gameplay',
    thumbnail: 'https://picsum.photos/200/200?random=2',
    trackCount: 18,
    totalDuration: '1h 12m',
    tracks: [
      { id: '3', title: 'Cyber Storm', duration: '3:28', plays: 15600 },
      { id: '4', title: 'Matrix Flow', duration: '4:05', plays: 11200 },
    ],
  },
  {
    id: '3',
    title: 'Ambient Soundscapes',
    description: 'Atmospheric sounds for puzzle and strategy games',
    thumbnail: 'https://picsum.photos/200/200?random=3',
    trackCount: 12,
    totalDuration: '55m',
    tracks: [
      { id: '5', title: 'Floating Particles', duration: '5:15', plays: 7800 },
      { id: '6', title: 'Deep Space', duration: '6:22', plays: 9300 },
    ],
  },
];

const mockFeaturedTracks = [
  {
    id: '1',
    title: 'Epic Battle Theme',
    duration: '4:32',
    plays: 125000,
  },
  {
    id: '2', 
    title: 'Ambient Exploration',
    duration: '3:45',
    plays: 89000,
  },
  {
    id: '3',
    title: 'Victory Celebration',
    duration: '2:18',
    plays: 156000,
  },
];

const mockUsers = {
  gamedev_pro: {
    name: 'gamedev_pro',
    avatar: 'https://i.pravatar.cc/150?img=1',
    followers: 12500,
    following: 340,
    bio: 'Game developer & music producer. Creating immersive gaming experiences with custom soundtracks.',
  },
  musicapp_official: {
    name: 'musicapp_official',
    avatar: 'https://i.pravatar.cc/150?img=2',
    followers: 45600,
    following: 120,
    bio: 'Official MusicApp account. Curating the best music for gamers worldwide.',
  },
  vocalgamer_pro: {
    name: 'vocalgamer_pro',
    avatar: 'https://i.pravatar.cc/150?img=1',
    followers: 8500,
    following: 245,
    bio: 'Voice gaming enthusiast. Creating vocal challenges and interactive music games.',
  },
  classical_master: {
    name: 'classical_master',
    avatar: 'https://i.pravatar.cc/150?img=3',
    followers: 15600,
    following: 180,
    bio: 'Classical music instructor. Teaching vocal techniques through gaming.',
  },
  rockstar_vocals: {
    name: 'rockstar_vocals',
    avatar: 'https://i.pravatar.cc/150?img=2',
    followers: 22100,
    following: 320,
    bio: 'Rock vocalist and game streamer. High-energy vocal gaming content.',
  },
};

export default function UserProfileScreen({ route, navigation }) {
  const { userId, username } = route.params || {};
  const [user, setUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log('===== Fetching user profile data =====');
        console.log('User ID:', userId);
        console.log('Username:', username);
        
        // Fetch user data and user's content in parallel
        const [userData, userContentData] = await Promise.all([
          userService.getUserById(userId),
          contentService.getUserContent(userId, 1, 20).catch(err => {
            console.warn('Failed to fetch user content, using empty array:', err);
            return { contents: [] };
          })
        ]);
        
        console.log('===== User Profile Data:', JSON.stringify(userData, null, 2), '=====');
        console.log('===== User Content Data:', JSON.stringify(userContentData, null, 2), '=====');
        
        setUser(userData);
        
        // Transform user's content to posts format
        if (userContentData.contents && userContentData.contents.length > 0) {
          const posts = userContentData.contents.map(content => ({
            id: content.id,
            title: content.title,
            description: content.description,
            thumbnailUrl: content.media_type === 'video' 
              ? `https://picsum.photos/300/300?random=${content.id}` 
              : `https://picsum.photos/300/300?random=${content.id}`,
            videoUrl: content.download_url,
            mediaType: content.media_type,
            createdAt: content.created_at
          }));
          setUserPosts(posts);
        }
      } catch (err) {
        console.error('===== Error fetching user profile:', err, '=====');
        setError('Failed to load user profile');
        
        // Fallback to mock data if API fails
        const fallbackUser = mockUsers[username] || {
          id: userId,
          username: username,
          signup_username: username,
          profile_image_url: 'https://i.pravatar.cc/150?img=4',
          total_subscribers: 1250,
          bio: 'Music enthusiast and content creator.',
          total_content_created: 0
        };
        setUser(fallbackUser);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    } else {
      setError('No user ID provided');
      setIsLoading(false);
    }
  }, [userId, username]);

  const handleFollowToggle = () => {
    console.log('Follow toggled for user:', user?.username);
  };

  const handleMessage = () => {
    console.log('Message user:', user?.username);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: AppColors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: AppColors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: AppColors.background }]}>
      <MusicCreatorProfile 
        creatorName={user?.signup_username || user?.username || 'Unknown User'}
        username={user?.username || username || 'Unknown User'}
        avatar={user?.profile_image_url || 'https://i.pravatar.cc/150?img=4'}
        followers={user?.total_subscribers || 0}
        following={0} // Not available in API response
        bio={user?.bio || 'Music creator and content maker'}
        featuredTracks={mockFeaturedTracks || []}
        playlists={mockPlaylists || []}
        userPosts={userPosts || []}
        onFollowToggle={handleFollowToggle}
        onMessage={handleMessage}
        navigation={navigation}
        userId={userId} // Pass userId for navigation
        totalContent={user?.total_content_created || 0}
        yearsOfExperience={user?.years_of_experience || 0}
        location={user?.location || ''}
        isVerified={user?.is_verified || false}
        subscriptionTier={user?.subscription_tier || 'free'}
      />
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: AppColors.error || AppColors.textSecondary,
    textAlign: 'center',
  },
});
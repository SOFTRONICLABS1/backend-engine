import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { IconSymbol } from '../../components/ui/IconSymbol';
import socialService from '../../api/services/socialService';
import { navigateToUserProfile } from '../../utils/navigationHelpers';

export default function FollowersScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Get user info from route params (if viewing someone else's followers)
  const userId = route?.params?.userId;
  const username = route?.params?.username;
  const isMyProfile = !userId; // If no userId provided, it's current user's profile

  const fetchFollowers = async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1) {
        isRefresh ? setRefreshing(true) : setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Use appropriate API based on whether it's current user or someone else
      const result = isMyProfile 
        ? await socialService.getMyFollowers(pageNum, 20)
        : await socialService.getUserFollowers(userId, pageNum, 20);
      
      if (pageNum === 1) {
        setFollowers(result.data.followers);
      } else {
        setFollowers(prev => [...prev, ...result.data.followers]);
      }
      
      setPage(pageNum);
      setTotalPages(result.data.total_pages);
      setTotal(result.data.total);
    } catch (error) {
      console.error('❌ Failed to fetch followers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFollowers();
  }, []);

  const onRefresh = () => {
    fetchFollowers(1, true);
  };

  const loadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchFollowers(page + 1);
    }
  };

  const renderFollower = ({ item }) => (
    <TouchableOpacity
      style={[styles.followerItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
      onPress={() => navigateToUserProfile(navigation, item.id, item.username, 'FollowersScreen')}
    >
      <Image 
        source={{ uri: item.profile_image_url || `https://picsum.photos/50/50?random=${item.id}` }} 
        style={styles.avatar} 
      />
      <View style={styles.userInfo}>
        <Text style={[styles.displayName, { color: theme.text }]}>
          {item.signup_username || item.username}
        </Text>
        <Text style={[styles.username, { color: theme.textSecondary }]}>
          @{item.username}
        </Text>
        {item.bio && (
          <Text style={[styles.bio, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
        <Text style={[styles.followedAt, { color: theme.textTertiary }]}>
          Followed {new Date(item.followed_at).toLocaleDateString()}
        </Text>
      </View>
      {item.is_verified && (
        <IconSymbol name="checkmark.seal.fill" size={16} color={theme.primary} />
      )}
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <IconSymbol name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isMyProfile ? 'Followers' : `${username}'s Followers`}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconSymbol name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {isMyProfile 
            ? `Followers (${total.toLocaleString()})` 
            : `${username}'s Followers (${total.toLocaleString()})`
          }
        </Text>
        <View style={{ width: 40 }} />
      </View>
      
      <FlatList
        data={followers}
        renderItem={renderFollower}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={theme.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No followers yet
            </Text>
          </View>
        }
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    marginBottom: 2,
  },
  bio: {
    fontSize: 13,
    marginBottom: 2,
  },
  followedAt: {
    fontSize: 12,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
  },
});
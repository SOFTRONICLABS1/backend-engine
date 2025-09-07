import React, { useState } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  View, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Text,
  Image,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { IconSymbol } from '../../components/ui/IconSymbol';
import searchService from '../../api/services/searchService';

// Mock data for search results
const mockAccounts = [
  { id: 1, username: 'pianoplayer123', name: 'Sarah Johnson', avatar: 'https://picsum.photos/50/50?random=101', followers: 12500, isVerified: true },
  { id: 2, username: 'guitarmaster', name: 'Mike Rodriguez', avatar: 'https://picsum.photos/50/50?random=102', followers: 8900, isVerified: false },
  { id: 3, username: 'musicteacher_anna', name: 'Anna Wilson', avatar: 'https://picsum.photos/50/50?random=103', followers: 15200, isVerified: true },
  { id: 4, username: 'beatmaker_pro', name: 'DJ Marcus', avatar: 'https://picsum.photos/50/50?random=104', followers: 22100, isVerified: true },
];

const mockMusicVideos = [
  { id: 1, title: 'Piano Melody Tutorial', thumbnail: 'https://picsum.photos/200/200?random=1', creator: 'pianoplayer123', duration: '2:45', likes: 1200, views: 45600 },
  { id: 2, title: 'Guitar Solo Masterclass', thumbnail: 'https://picsum.photos/200/200?random=2', creator: 'guitarmaster', duration: '3:20', likes: 890, views: 23400 },
  { id: 3, title: 'Vocal Training Basics', thumbnail: 'https://picsum.photos/200/200?random=3', creator: 'musicteacher_anna', duration: '10:15', likes: 2100, views: 67800 },
  { id: 4, title: 'Jazz Improvisation', thumbnail: 'https://picsum.photos/200/200?random=4', creator: 'jazzmaster_tom', duration: '4:30', likes: 756, views: 18900 },
  { id: 5, title: 'Beat Making Session', thumbnail: 'https://picsum.photos/200/200?random=5', creator: 'beatmaker_pro', duration: '8:45', likes: 1800, views: 89200 },
];

const mockTags = [
  { id: 1, name: 'piano', count: 125000 },
  { id: 2, name: 'tutorial', count: 89000 },
  { id: 3, name: 'classical', count: 56700 },
  { id: 4, name: 'jazz', count: 34500 },
  { id: 5, name: 'beginner', count: 78900 },
  { id: 6, name: 'advanced', count: 23400 },
];

// Dummy content data for the grid (when not searching)
const dummyContent = [
  { id: 1, title: 'Piano Melody', thumbnail: 'https://picsum.photos/200/200?random=1', type: 'audio', duration: '2:45', likes: 1200 },
  { id: 2, title: 'Guitar Solo', thumbnail: 'https://picsum.photos/200/200?random=2', type: 'video', duration: '3:20', likes: 890 },
  { id: 3, title: 'Vocal Training', thumbnail: 'https://picsum.photos/200/200?random=3', type: 'lesson', duration: '10:15', likes: 2100 },
  { id: 4, title: 'Jazz Improvisation', thumbnail: 'https://picsum.photos/200/200?random=4', type: 'video', duration: '4:30', likes: 756 },
  { id: 5, title: 'Beat Making', thumbnail: 'https://picsum.photos/200/200?random=5', type: 'tutorial', duration: '8:45', likes: 1800 },
  { id: 6, title: 'Classical Symphony', thumbnail: 'https://picsum.photos/200/200?random=6', type: 'audio', duration: '12:30', likes: 623 },
  { id: 7, title: 'Drum Practice', thumbnail: 'https://picsum.photos/200/200?random=7', type: 'lesson', duration: '5:15', likes: 945 },
  { id: 8, title: 'Violin Technique', thumbnail: 'https://picsum.photos/200/200?random=8', type: 'tutorial', duration: '7:22', likes: 1456 },
  { id: 9, title: 'Music Theory', thumbnail: 'https://picsum.photos/200/200?random=9', type: 'lesson', duration: '15:00', likes: 2789 },
  { id: 10, title: 'Songwriting Tips', thumbnail: 'https://picsum.photos/200/200?random=10', type: 'tutorial', duration: '9:18', likes: 1122 },
];

export default function ExploreScreen({ navigation }) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Accounts');
  const [isLoading, setIsLoading] = useState(false);

  const tabs = ['Accounts', 'Music Videos', 'Tags'];

  const handleSearch = async (query) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      // In a real app, you would call the appropriate search service
      // For now, we'll simulate the API call
      console.log(`Searching for: ${query} in ${activeTab}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSearchResults = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Searching...</Text>
        </View>
      );
    }

    if (!searchQuery) {
      // Show content grid when not searching
      return (
        <FlatList
          data={dummyContent}
          renderItem={renderContentItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentGrid}
        />
      );
    }

    switch (activeTab) {
      case 'Accounts':
        return renderAccountResults();
      case 'Music Videos':
        return renderMusicVideoResults();
      case 'Tags':
        return renderTagResults();
      default:
        return null;
    }
  };

  const renderContentItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.contentItem, { backgroundColor: theme.surface }]}
      onPress={() => navigation.navigate('ContentViewer', { contentId: item.id })}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.contentThumbnail} />
      <View style={styles.contentOverlay}>
        <Text style={[styles.contentDuration, { color: theme.text }]}>{item.duration}</Text>
      </View>
      <View style={styles.contentInfo}>
        <Text style={[styles.contentTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
        <View style={styles.contentStats}>
          <IconSymbol name="heart" size={12} color={theme.textSecondary} />
          <Text style={[styles.contentLikes, { color: theme.textSecondary }]}>{item.likes}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAccountResults = () => (
    <FlatList
      data={mockAccounts}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={[styles.accountItem, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
        >
          <Image source={{ uri: item.avatar }} style={styles.accountAvatar} />
          <View style={styles.accountInfo}>
            <View style={styles.accountHeader}>
              <Text style={[styles.accountName, { color: theme.text }]}>{item.name}</Text>
              {item.isVerified && (
                <IconSymbol name="checkmark" size={16} color={theme.primary} />
              )}
            </View>
            <Text style={[styles.accountUsername, { color: theme.textSecondary }]}>@{item.username}</Text>
            <Text style={[styles.accountFollowers, { color: theme.textSecondary }]}>
              {item.followers.toLocaleString()} followers
            </Text>
          </View>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderMusicVideoResults = () => (
    <FlatList
      data={mockMusicVideos}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={[styles.videoItem, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate('ContentViewer', { contentId: item.id })}
        >
          <Image source={{ uri: item.thumbnail }} style={styles.videoThumbnail} />
          <View style={styles.videoInfo}>
            <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
            <Text style={[styles.videoCreator, { color: theme.textSecondary }]}>by {item.creator}</Text>
            <View style={styles.videoStats}>
              <Text style={[styles.videoStat, { color: theme.textSecondary }]}>{item.duration}</Text>
              <Text style={[styles.videoStat, { color: theme.textSecondary }]}>•</Text>
              <Text style={[styles.videoStat, { color: theme.textSecondary }]}>{item.views.toLocaleString()} views</Text>
              <Text style={[styles.videoStat, { color: theme.textSecondary }]}>•</Text>
              <Text style={[styles.videoStat, { color: theme.textSecondary }]}>{item.likes} likes</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderTagResults = () => (
    <FlatList
      data={mockTags}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={[styles.tagItem, { backgroundColor: theme.surface }]}
          onPress={() => {
            // Navigate to tag content or update search
            setSearchQuery(`#${item.name}`);
            setActiveTab('Music Videos');
          }}
        >
          <View style={styles.tagInfo}>
            <Text style={[styles.tagName, { color: theme.text }]}>#{item.name}</Text>
            <Text style={[styles.tagCount, { color: theme.textSecondary }]}>
              {item.count.toLocaleString()} posts
            </Text>
          </View>
          <IconSymbol name="chevron.forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
      showsVerticalScrollIndicator={false}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Header */}
      <View style={[styles.searchHeader, { backgroundColor: theme.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <IconSymbol name="magnifyingglass" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search music, people, tags..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Tabs */}
      {searchQuery.length > 0 && (
        <View style={[styles.tabContainer, { backgroundColor: theme.background }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && { backgroundColor: theme.primary }
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab ? '#FFFFFF' : theme.text }
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsContainer}>
        {renderSearchResults()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Content Grid Styles
  contentGrid: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  contentItem: {
    flex: 0.48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  contentThumbnail: {
    width: '100%',
    aspectRatio: 1,
  },
  contentOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  contentDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentInfo: {
    padding: 12,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentLikes: {
    fontSize: 12,
  },
  // Account Results Styles
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  accountAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  accountInfo: {
    flex: 1,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  accountFollowers: {
    fontSize: 12,
    marginTop: 2,
  },
  // Video Results Styles
  videoItem: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  videoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoCreator: {
    fontSize: 14,
    marginBottom: 4,
  },
  videoStats: {
    flexDirection: 'row',
    gap: 8,
  },
  videoStat: {
    fontSize: 12,
  },
  // Tag Results Styles
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  tagCount: {
    fontSize: 14,
  },
});
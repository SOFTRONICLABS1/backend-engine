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
  FlatList
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { IconSymbol } from '../../components/ui/IconSymbol';

// Dummy content data for this user (will be replaced with API data)
const dummyUserContent = [
  { 
    id: 1, 
    title: 'My Piano Cover', 
    thumbnail: 'https://picsum.photos/200/200?random=101', 
    type: 'audio', 
    duration: '2:45', 
    likes: 1200,
    description: '🎹 Beautiful piano melody that I composed last night! Hope you enjoy it #piano #original'
  },
  { 
    id: 2, 
    title: 'Guitar Session', 
    thumbnail: 'https://picsum.photos/200/200?random=102', 
    type: 'video', 
    duration: '3:20', 
    likes: 890,
    description: '🎸 Jamming with my favorite guitar riffs! Turn up the volume! #guitar #rock'
  },
];

export default function UserExploreScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userName } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContent, setFilteredContent] = useState(dummyUserContent);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredContent(dummyUserContent);
    } else {
      const filtered = dummyUserContent.filter(content => 
        content.title.toLowerCase().includes(text.toLowerCase()) ||
        content.type.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredContent(filtered);
    }
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

  const renderContentItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.contentCard, { backgroundColor: theme.surface }]}
      onPress={() => {
        console.log('Navigate to content:', item.title);
        // TODO: Navigate to content detail or player
      }}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.contentThumbnail} />
      <View style={styles.contentOverlay}>
        <Text style={styles.contentIcon}>{getContentIcon(item.type)}</Text>
        <Text style={[styles.duration, { color: 'white' }]}>{item.duration}</Text>
      </View>
      <View style={styles.contentInfo}>
        <Text style={[styles.contentTitle, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.contentStats}>
          <Text style={[styles.contentType, { color: theme.primary }]}>
            {item.type ? item.type.toUpperCase() : 'VIDEO'}
          </Text>
          <Text style={[styles.likes, { color: theme.textSecondary }]}>
            ❤️ {item.likes > 1000 ? `${(item.likes/1000).toFixed(1)}K` : item.likes}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Search */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <IconSymbol name="chevron.left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {userName ? `@${userName}` : 'User Content'}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <IconSymbol name="magnifyingglass" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search content..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <IconSymbol name="xmark.circle.fill" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content Grid */}
      <FlatList
        data={filteredContent}
        renderItem={renderContentItem}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerPlaceholder: {
    width: 40,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  gridContainer: {
    padding: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  contentCard: {
    width: '48%',
    borderRadius: 12,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  contentThumbnail: {
    width: '100%',
    height: 120,
  },
  contentOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  contentIcon: {
    fontSize: 12,
  },
  duration: {
    fontSize: 10,
    fontWeight: '600',
  },
  contentInfo: {
    padding: 12,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 18,
  },
  contentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentType: {
    fontSize: 10,
    fontWeight: '700',
  },
  likes: {
    fontSize: 11,
    fontWeight: '500',
  },
});
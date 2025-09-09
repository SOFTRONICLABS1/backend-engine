import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import gamesService from '../api/services/gamesService';

export default function GamesPickerModal({ visible, onClose, onSelectGames, selectedGameIds = [] }) {
  const { theme } = useTheme();
  const [games, setGames] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize selected game IDs
  useEffect(() => {
    if (selectedGameIds && selectedGameIds.length > 0) {
      setSelectedIds(new Set(selectedGameIds));
    }
  }, [selectedGameIds]);

  // Fetch games when modal opens
  useEffect(() => {
    if (visible) {
      fetchGames(1, true);
    }
  }, [visible]);

  const fetchGames = async (pageNum = 1, reset = false) => {
    if (loading && !reset) return;

    try {
      setLoading(true);
      const response = await gamesService.getGames(pageNum, 20);
      
      if (response.games) {
        if (reset) {
          setGames(response.games);
          setPage(1);
        } else {
          setGames(prev => [...prev, ...response.games]);
        }
        setTotalPages(response.total_pages || 1);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
      Alert.alert('Error', 'Failed to load games. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGames(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && page < totalPages) {
      fetchGames(page + 1);
    }
  };

  const toggleGameSelection = (game) => {
    const newSelectedIds = new Set(selectedIds);
    
    // Use game ID as the identifier for selection
    if (newSelectedIds.has(game.id)) {
      newSelectedIds.delete(game.id);
    } else {
      newSelectedIds.add(game.id);
    }
    
    setSelectedIds(newSelectedIds);
  };

  const handleDone = () => {
    // Convert selected game IDs to array and get corresponding games info
    const selectedIdsArray = Array.from(selectedIds);
    const selectedGamesInfo = games.filter(game => selectedIds.has(game.id));
    
    onSelectGames(selectedIdsArray, selectedGamesInfo);
    onClose();
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const filteredGames = games.filter(game => 
    game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (game.description && game.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderGameItem = ({ item }) => {
    const isSelected = selectedIds.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.gameCard,
          {
            backgroundColor: isSelected ? `${theme.primary}20` : theme.surface,
            borderColor: isSelected ? theme.primary : theme.border,
          }
        ]}
        onPress={() => toggleGameSelection(item)}
      >
        <View style={styles.gameCardContent}>
          <View style={styles.gameIcon}>
            <Text style={styles.gameIconText}>🎮</Text>
          </View>
          <Text style={[styles.gameCardTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={[styles.gameCardDescription, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          {/* Checkbox inside the card */}
          <View style={[
            styles.gameCardCheckbox,
            {
              backgroundColor: isSelected ? theme.primary : 'transparent',
              borderColor: isSelected ? theme.primary : theme.border
            }
          ]}>
            {isSelected && (
              <Text style={styles.gameCardCheckmark}>✓</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading || page === 1) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.card || theme.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.cancelButton, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: theme.text }]}>Choose Games</Text>
            
            <TouchableOpacity onPress={handleDone}>
              <Text style={[styles.doneButton, { color: theme.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Search games..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Selection Info */}
          {selectedIds.size > 0 && (
            <View style={[styles.selectionInfo, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
              <Text style={[styles.selectionText, { color: theme.text }]}>
                {selectedIds.size} game{selectedIds.size !== 1 ? 's' : ''} selected
              </Text>
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={[styles.clearButton, { color: theme.primary }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}


          {/* Games List */}
          {loading && page === 1 ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading games...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredGames}
              renderItem={renderGameItem}
              keyExtractor={(item) => item.id}
              numColumns={3}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    {searchQuery ? 'No games found matching your search' : 'No games available'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  // Game Card Styles (3 columns)
  gameCard: {
    width: '31%',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  gameCardContent: {
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  gameIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameIconText: {
    fontSize: 20,
  },
  gameCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 18,
  },
  gameCardDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 8,
    minHeight: 28,
  },
  gameCardCheckbox: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameCardCheckmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
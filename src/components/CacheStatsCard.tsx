/**
 * Cache Stats Card Component
 * Shows video cache statistics and management options
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { useTheme } from '../theme/ThemeContext';
import contentCacheService from '../services/ContentCacheService';

interface CacheStats {
  totalItems: number;
  validItems: number;
  expiredUrls: number;
  expiredData: number;
  hitRate: number;
}

export const CacheStatsCard: React.FC = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<CacheStats>({
    totalItems: 0,
    validItems: 0,
    expiredUrls: 0,
    expiredData: 0,
    hitRate: 0
  });
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const cacheStats = contentCacheService.getCacheStats();
    setStats(cacheStats);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Video Cache',
      'This will clear all cached video URLs and force fresh downloads. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await contentCacheService.clearCache();
              loadStats();
              Alert.alert('Success', 'Video cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
              console.error('Cache clear error:', error);
            } finally {
              setIsClearing(false);
            }
          }
        }
      ]
    );
  };

  const formatHitRate = (rate: number) => {
    return `${Math.round(rate * 100)}%`;
  };

  const getCacheEfficiencyColor = (hitRate: number) => {
    if (hitRate >= 0.8) return '#4CAF50'; // Green - Excellent
    if (hitRate >= 0.6) return '#FF9800'; // Orange - Good
    return '#F44336'; // Red - Needs improvement
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <IconSymbol name="play" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Video Cache</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.background }]}
          onPress={loadStats}
        >
          <IconSymbol name="arrow.clockwise" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.totalItems}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Cached Videos</Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: getCacheEfficiencyColor(stats.hitRate) }
              ]}
            >
              {formatHitRate(stats.hitRate)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Hit Rate</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.success || '#4CAF50' }]}>
              {stats.validItems}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Valid</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.warning || '#FF9800' }]}>
              {stats.expiredUrls}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>URL Expired</Text>
          </View>
        </View>

        {stats.totalItems > 0 && (
          <View style={styles.efficiencyContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${stats.hitRate * 100}%`,
                    backgroundColor: getCacheEfficiencyColor(stats.hitRate)
                  }
                ]}
              />
            </View>
            <Text style={[styles.efficiencyText, { color: theme.textSecondary }]}>
              Cache Efficiency: {stats.hitRate >= 0.8 ? 'Excellent' : stats.hitRate >= 0.6 ? 'Good' : 'Needs Improvement'}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.clearButton,
          {
            backgroundColor: isClearing ? theme.border : theme.background,
            borderColor: theme.border
          }
        ]}
        onPress={handleClearCache}
        disabled={isClearing || stats.totalItems === 0}
      >
        <IconSymbol
          name={isClearing ? "arrow.clockwise" : "trash"}
          size={16}
          color={stats.totalItems === 0 ? theme.textSecondary : theme.error || '#F44336'}
        />
        <Text
          style={[
            styles.clearButtonText,
            {
              color: stats.totalItems === 0 ? theme.textSecondary : theme.error || '#F44336'
            }
          ]}
        >
          {isClearing ? 'Clearing...' : 'Clear Cache'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 6,
    borderRadius: 6,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  efficiencyContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  efficiencyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CacheStatsCard;
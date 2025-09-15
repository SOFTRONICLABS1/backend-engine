/**
 * Games Service
 * Handles game-related API calls
 */

import apiClient from '../client';
import { API_ENDPOINTS } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameScorePayload, GameScoreResponse } from '../../types/GameScore';

const BASE_URL = 'https://24pw8gqd0i.execute-api.us-east-1.amazonaws.com/api/v1';

interface Game {
  game_id: string;
  game_name: string;
  content_id: string;
  content_name: string;
  score: number;
  last_played_time: string;
}

interface RecentGamesResponse {
  games: Game[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface ContentDetails {
  id: string;
  user_id: string;
  signup_username: string | null;
  title: string;
  description: string;
  content_type: string;
  download_url: string;
  media_type: string;
  social_url: string | null;
  social_platform: string | null;
  notes_data: any;
  tempo: number;
  is_public: boolean;
  access_type: string;
  tags: string[];
  play_count: number;
  avg_score: number | null;
  created_at: string;
  updated_at: string;
}

interface GameWithContent extends Game {
  contentDetails: ContentDetails | null;
  timeSinceLastPlayed: string;
}

class GamesService {
  /**
   * Get list of all games
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20)
   * @returns {Promise} List of games
   */
  async getAllGames(page = 1, limit = 20) {
    try {
      console.log('=================== Fetching All Games ===================');
      
      const response = await apiClient.get(`${API_ENDPOINTS.GAMES.LIST}?page=${page}&per_page=${limit}`);
      
      console.log('✅ All games fetched successfully');
      console.log('=================== All Games Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch games:', error);
      throw error;
    }
  }

  /**
   * Get list of all games (alias for getAllGames - for compatibility)
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20)
   * @returns {Promise} List of games
   */
  async getGames(page = 1, limit = 20) {
    return this.getAllGames(page, limit);
  }

  /**
   * Get games for specific content
   * @param {string} contentId - Content ID
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20)
   * @returns {Promise} Content-specific games
   */
  async getContentGames(contentId: string, page = 1, limit = 20) {
    try {
      console.log('=================== Fetching Content Games ===================');
      
      const response = await apiClient.get(`${API_ENDPOINTS.GAMES.CONTENT_GAMES(contentId)}?page=${page}&per_page=${limit}`);
      
      console.log('✅ Content games fetched successfully');
      console.log('=================== Content Games Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch content games:', error);
      throw error;
    }
  }

  /**
   * Get game details by ID
   * @param {string} gameId - Game ID
   * @returns {Promise} Game details
   */
  async getGameDetails(gameId: string) {
    try {
      console.log('=================== Fetching Game Details ===================');
      
      const response = await apiClient.get(API_ENDPOINTS.GAMES.GAME_DETAILS(gameId));
      
      console.log('✅ Game details fetched successfully');
      console.log('=================== Game Details Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch game details:', error);
      throw error;
    }
  }

  /**
   * Submit game score
   * @param {string} gameId - Game ID
   * @param {GameScorePayload} scoreData - Score data
   * @returns {Promise<GameScoreResponse>} Score submission result
   */
  async submitScore(gameId: string, scoreData: GameScorePayload): Promise<GameScoreResponse> {
    try {
      console.log('=================== Submitting Game Score ===================');
      
      const response = await apiClient.post(API_ENDPOINTS.GAMES.SUBMIT_SCORE(gameId), scoreData);
      
      console.log('✅ Game score submitted successfully');
      console.log('=================== Game Score Submitted ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to submit game score:', error);
      throw error;
    }
  }

  /**
   * Get game leaderboard
   * @param {string} gameId - Game ID (optional, for game-specific leaderboard)
   * @param {number} limit - Number of entries (default: 50)
   * @returns {Promise} Leaderboard data
   */
  async getLeaderboard(gameId?: string, limit = 50) {
    try {
      console.log('=================== Fetching Game Leaderboard ===================');
      
      let url = `${API_ENDPOINTS.GAMES.LEADERBOARD}?per_page=${limit}`;
      if (gameId) {
        url += `&game_id=${gameId}`;
      }
      
      const response = await apiClient.get(url);
      
      console.log('✅ Game leaderboard fetched successfully');
      console.log('=================== Game Leaderboard Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch game leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get user's recent games
   * @param {number} page - Page number (default: 1)
   * @param {number} perPage - Items per page (default: 20)
   * @returns {Promise<RecentGamesResponse>} Recent games data
   */
  async getRecentGames(page: number = 1, perPage: number = 20): Promise<RecentGamesResponse> {
    try {
      console.log('=================== Fetching Recent Games ===================');
      
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(
        `${BASE_URL}/games/latest-played-from-logs?page=${page}&per_page=${perPage}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch recent games: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('✅ Recent games fetched successfully');
      console.log('=================== Recent Games Fetched ===================');
      
      return data;
    } catch (error) {
      console.error('Error fetching recent games:', error);
      throw error;
    }
  }

  /**
   * Get content details by content ID
   * @param {string} contentId - Content ID
   * @returns {Promise<ContentDetails>} Content details
   */
  async getContentDetails(contentId: string): Promise<ContentDetails> {
    try {
      console.log(`=================== Fetching Content Details for ${contentId} ===================`);
      
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(
        `${BASE_URL}/content/${contentId}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch content details: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('✅ Content details fetched successfully');
      console.log('=================== Content Details Fetched ===================');
      
      return data;
    } catch (error) {
      console.error(`Error fetching content details for ${contentId}:`, error);
      throw error;
    }
  }

  /**
   * Get recent games with their content details (last 5 games)
   * @returns {Promise<GameWithContent[]>} Games with content details
   */
  async getRecentGamesWithDetails(): Promise<GameWithContent[]> {
    try {
      console.log('=================== Fetching Recent Games With Details ===================');
      
      // Get recent games
      const recentGames = await this.getRecentGames(1, 5);
      
      if (!recentGames.games || recentGames.games.length === 0) {
        console.log('No recent games found');
        return [];
      }

      // Fetch content details for each game
      const gamesWithDetails = await Promise.all(
        recentGames.games.map(async (game) => {
          try {
            const contentDetails = await this.getContentDetails(game.content_id);
            const timeSinceLastPlayed = this.calculateTimeSinceLastPlayed(game.last_played_time);
            
            return {
              ...game,
              contentDetails,
              timeSinceLastPlayed,
            };
          } catch (error) {
            console.warn(`Failed to fetch content details for game ${game.game_id}:`, error);
            return {
              ...game,
              contentDetails: null,
              timeSinceLastPlayed: this.calculateTimeSinceLastPlayed(game.last_played_time),
            };
          }
        })
      );

      console.log('✅ Recent games with details fetched successfully');
      console.log('=================== Recent Games With Details Fetched ===================');

      return gamesWithDetails;
    } catch (error) {
      console.error('Error fetching recent games with details:', error);
      throw error;
    }
  }

  /**
   * Calculate time since last played in human readable format
   * @param {string} lastPlayedTime - ISO timestamp
   * @returns {string} Time since last played (e.g., "2 hours ago")
   */
  private calculateTimeSinceLastPlayed(lastPlayedTime: string): string {
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
  }
}

export default new GamesService();
export type { Game, RecentGamesResponse, ContentDetails, GameWithContent };
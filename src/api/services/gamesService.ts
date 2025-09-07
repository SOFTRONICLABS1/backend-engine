/**
 * Games Service
 * Handles game-related API calls
 */

import apiClient from '../client';
import { API_ENDPOINTS } from '../config';

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
      
      const response = await apiClient.get(`${API_ENDPOINTS.GAMES.LIST}?page=${page}&limit=${limit}`);
      
      console.log('✅ All games fetched successfully');
      console.log('=================== All Games Fetched ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch games:', error);
      throw error;
    }
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
      
      const response = await apiClient.get(`${API_ENDPOINTS.GAMES.CONTENT_GAMES(contentId)}?page=${page}&limit=${limit}`);
      
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
   * @param {object} scoreData - Score data
   * @returns {Promise} Score submission result
   */
  async submitScore(gameId: string, scoreData: any) {
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
      
      let url = `${API_ENDPOINTS.GAMES.LEADERBOARD}?limit=${limit}`;
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
}

export default new GamesService();
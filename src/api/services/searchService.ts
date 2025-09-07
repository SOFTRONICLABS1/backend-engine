/**
 * Search Service
 * Handles search-related API calls
 */

import apiClient from '../client';
import { API_ENDPOINTS } from '../config';

class SearchService {
  /**
   * Search for user accounts
   * @param {string} query - Search query
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20)
   * @returns {Promise} Search results
   */
  async searchAccounts(query: string, page = 1, limit = 20) {
    try {
      console.log('=================== Searching Accounts ===================');
      
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.ACCOUNTS}?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
      
      console.log('✅ Account search completed successfully');
      console.log('=================== Account Search Completed ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to search accounts:', error);
      throw error;
    }
  }

  /**
   * Search for content
   * @param {string} query - Search query
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20)
   * @returns {Promise} Search results
   */
  async searchContent(query: string, page = 1, limit = 20) {
    try {
      console.log('=================== Searching Content ===================');
      
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.CONTENT}?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
      
      console.log('✅ Content search completed successfully');
      console.log('=================== Content Search Completed ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to search content:', error);
      throw error;
    }
  }

  /**
   * Search for tags
   * @param {string} query - Search query
   * @param {number} limit - Items per page (default: 20)
   * @returns {Promise} Search results
   */
  async searchTags(query: string, limit = 20) {
    try {
      console.log('=================== Searching Tags ===================');
      
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.TAGS}?q=${encodeURIComponent(query)}&limit=${limit}`);
      
      console.log('✅ Tag search completed successfully');
      console.log('=================== Tag Search Completed ===================');
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to search tags:', error);
      throw error;
    }
  }
}

export default new SearchService();
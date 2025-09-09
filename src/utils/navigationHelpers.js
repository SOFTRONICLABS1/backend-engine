/**
 * Navigation Helpers
 * Utility functions for consistent navigation behavior across the app
 */

import authService from '../api/services/authService';

/**
 * Navigate to user profile - own profile or other user's profile
 * @param {object} navigation - React Navigation object
 * @param {string} targetUserId - User ID to navigate to
 * @param {string} username - Username for the target user
 * @param {string} source - Source of navigation (for logging)
 * @returns {Promise} Navigation promise
 */
export const navigateToUserProfile = async (navigation, targetUserId, username, source = 'unknown') => {
  try {
    const currentUserId = await authService.getCurrentUserId();
    
    console.log(`🧭 Navigating to user profile from ${source}:`, {
      currentUserId: currentUserId,
      targetUserId: targetUserId,
      username: username,
      isOwnProfile: currentUserId === targetUserId
    });
    
    // Navigate to own profile or other user's profile
    if (currentUserId === targetUserId) {
      console.log(`🏠 Navigating to own profile from ${source}`);
      return navigation.navigate('Profile');
    } else {
      console.log(`👤 Navigating to other user's profile from ${source}`);
      return navigation.navigate('UserProfile', {
        userId: targetUserId,
        username: username
      });
    }
  } catch (error) {
    console.error(`❌ Failed to determine user profile navigation from ${source}:`, error);
    // Fallback to UserProfile if we can't determine ownership
    return navigation.navigate('UserProfile', {
      userId: targetUserId,
      username: username
    });
  }
};

export default {
  navigateToUserProfile
};
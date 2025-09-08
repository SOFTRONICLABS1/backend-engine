/**
 * Follow Status Manager
 * Manages follow status synchronization across all components
 */

type FollowStatusListener = (userId: string, isFollowing: boolean) => void;

class FollowStatusManager {
  private followStatus: Map<string, boolean> = new Map();
  private listeners: Set<FollowStatusListener> = new Set();

  /**
   * Subscribe to follow status changes
   * @param listener - Callback function to be called when follow status changes
   * @returns Unsubscribe function
   */
  subscribe(listener: FollowStatusListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update follow status for a user and notify all listeners
   * @param userId - User ID
   * @param isFollowing - New follow status
   */
  updateFollowStatus(userId: string, isFollowing: boolean): void {
    console.log('🔄 FollowStatusManager: Updating follow status for user:', userId, 'to:', isFollowing);
    
    const previousStatus = this.followStatus.get(userId);
    this.followStatus.set(userId, isFollowing);
    
    // Only notify if status actually changed
    if (previousStatus !== isFollowing) {
      console.log('📡 FollowStatusManager: Broadcasting follow status change to', this.listeners.size, 'listeners');
      this.listeners.forEach(listener => {
        try {
          listener(userId, isFollowing);
        } catch (error) {
          console.error('❌ FollowStatusManager: Error in listener:', error);
        }
      });
    }
  }

  /**
   * Get current follow status for a user
   * @param userId - User ID
   * @returns Follow status or undefined if not cached
   */
  getFollowStatus(userId: string): boolean | undefined {
    return this.followStatus.get(userId);
  }

  /**
   * Set initial follow status (without triggering listeners)
   * @param userId - User ID
   * @param isFollowing - Follow status
   */
  setInitialFollowStatus(userId: string, isFollowing: boolean): void {
    this.followStatus.set(userId, isFollowing);
  }

  /**
   * Clear all follow status data
   */
  clear(): void {
    console.log('🧹 FollowStatusManager: Clearing all follow status data');
    this.followStatus.clear();
  }

  /**
   * Get all cached follow statuses (for debugging)
   */
  getAllStatuses(): Map<string, boolean> {
    return new Map(this.followStatus);
  }
}

export default new FollowStatusManager();
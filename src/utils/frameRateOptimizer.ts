import { Platform } from 'react-native'

/**
 * Lightweight frame rate optimizer specifically for user graph rendering
 * Ensures 60fps even when user frequency is near target frequency
 */
export class FrameRateOptimizer {
  private lastFrameTime = 0
  private frameCount = 0
  private currentFPS = 60
  private isOptimizing = false

  /**
   * Check if we should skip processing to maintain frame rate
   */
  public shouldSkipFrame(): boolean {
    const now = performance.now()
    const deltaTime = now - this.lastFrameTime

    // Skip if frame rate is too high (more than 120fps) to prevent waste
    if (deltaTime < 8.33) { // 120fps threshold
      return true
    }

    // Update frame rate calculation
    this.updateFrameRate(deltaTime)
    this.lastFrameTime = now

    // Never skip on high-end devices
    if (this.currentFPS > 45) {
      return false
    }

    // Skip every other frame if struggling (< 45fps)
    this.frameCount++
    return this.frameCount % 2 === 1
  }

  /**
   * Get optimized point count based on current performance
   */
  public getOptimizedPointCount(requestedCount: number): number {
    if (this.currentFPS > 50) {
      return requestedCount // Full quality
    } else if (this.currentFPS > 30) {
      return Math.floor(requestedCount * 0.7) // Reduce by 30%
    } else {
      return Math.floor(requestedCount * 0.5) // Reduce by 50%
    }
  }

  /**
   * Get current frame rate
   */
  public getCurrentFPS(): number {
    return Math.round(this.currentFPS)
  }

  /**
   * Check if we're currently optimizing performance
   */
  public isCurrentlyOptimizing(): boolean {
    return this.isOptimizing
  }

  /**
   * Update frame rate calculation
   */
  private updateFrameRate(deltaTime: number): void {
    if (deltaTime > 0) {
      const instantFPS = 1000 / deltaTime

      // Smooth FPS calculation
      this.currentFPS = this.currentFPS * 0.9 + instantFPS * 0.1

      // Enable optimization if FPS drops
      this.isOptimizing = this.currentFPS < 45

      // Reset frame count periodically
      if (this.frameCount > 1000) {
        this.frameCount = 0
      }
    }
  }

  /**
   * Reset for new recording session
   */
  public reset(): void {
    this.lastFrameTime = 0
    this.frameCount = 0
    this.currentFPS = 60
    this.isOptimizing = false
  }
}

// Singleton instance
export const frameRateOptimizer = new FrameRateOptimizer()
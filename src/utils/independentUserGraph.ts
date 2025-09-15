import { Platform } from 'react-native'
import { frameRateOptimizer } from './frameRateOptimizer'

interface UserPoint {
  x: number
  y: number
  frequency: number
  timestamp: number
}

/**
 * Independent user graph processor that operates completely separately from target frequency
 * Eliminates any interference or collision detection that causes hanging near target frequencies
 */
export class IndependentUserGraph {
  private pointBuffer: UserPoint[] = []
  private lastProcessTime = 0
  private smoothingBuffer: number[] = []

  /**
   * Process user pitch points with frame rate optimization
   */
  public processUserPoint(frequency: number, timestamp: number, x: number, y: number): UserPoint[] {
    // Skip processing if frame rate is too high to prevent waste
    if (frameRateOptimizer.shouldSkipFrame()) {
      return this.pointBuffer
    }

    // Ultra-fast point addition
    const newPoint: UserPoint = {
      x,
      y,
      frequency,
      timestamp
    }

    this.pointBuffer.push(newPoint)

    // Adaptive cleanup based on performance
    const maxPoints = frameRateOptimizer.getOptimizedPointCount(250)
    if (this.pointBuffer.length > maxPoints) {
      const cutoffTime = timestamp - 5000 // 5 second lifetime
      this.pointBuffer = this.pointBuffer.filter(p => p.timestamp > cutoffTime)
    }

    // Return optimized buffer
    return this.pointBuffer
  }

  /**
   * Add point to buffer with smart capacity management
   */
  private addToBuffer(point: UserPoint): void {
    this.pointBuffer.push(point)

    // Remove old points (time-based, not proximity-based)
    const cutoffTime = point.timestamp - 8000 // 8 second lifetime
    this.pointBuffer = this.pointBuffer.filter(p => p.timestamp > cutoffTime)

    // Capacity management - keep most recent points
    if (this.pointBuffer.length > 200) {
      this.pointBuffer = this.pointBuffer.slice(-150) // Keep newest 150
    }
  }

  /**
   * Apply frequency smoothing without any target considerations
   */
  private applySmoothingOnly(frequency: number): number {
    // Simple smoothing buffer for stability
    this.smoothingBuffer.push(frequency)
    if (this.smoothingBuffer.length > 3) {
      this.smoothingBuffer.shift()
    }

    // Return weighted average for stability
    if (this.smoothingBuffer.length === 1) {
      return frequency
    }

    const weights = [0.1, 0.3, 0.6] // More weight to recent values
    let weightedSum = 0
    let totalWeight = 0

    for (let i = 0; i < this.smoothingBuffer.length; i++) {
      const weight = weights[i] || weights[weights.length - 1]
      weightedSum += this.smoothingBuffer[i] * weight
      totalWeight += weight
    }

    return weightedSum / totalWeight
  }

  /**
   * Get optimized points for rendering - no target interference
   */
  private getOptimizedPoints(): UserPoint[] {
    if (this.pointBuffer.length === 0) return []

    // Simple distance-based optimization - no target collision detection
    const optimized: UserPoint[] = []
    let lastKeptPoint: UserPoint | null = null

    for (const point of this.pointBuffer) {
      // Keep points based on visual distance only - no frequency collision detection
      if (!lastKeptPoint ||
          Math.abs(point.x - lastKeptPoint.x) > 1 ||
          Math.abs(point.y - lastKeptPoint.y) > 1) {
        optimized.push(point)
        lastKeptPoint = point
      }
    }

    return optimized
  }

  /**
   * Reset the processor (for new recordings)
   */
  public reset(): void {
    this.pointBuffer = []
    this.smoothingBuffer = []
    this.lastProcessTime = 0
    frameRateOptimizer.reset()
  }

  /**
   * Get current point count for debugging
   */
  public getPointCount(): number {
    return this.pointBuffer.length
  }
}

// Singleton instance for the user graph
export const independentUserGraph = new IndependentUserGraph()
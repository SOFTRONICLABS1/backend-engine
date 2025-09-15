import { Platform } from 'react-native'

interface SmoothPoint {
  x: number
  y: number
  frequency: number
  timestamp: number
}

interface NoteInfo {
  pitch: string
  startTime: number
  duration: number
}

/**
 * Enhanced target wave smoothing specifically for Android center line interactions
 * Prevents stuttering when notes end at or near the center line
 */
export class TargetWaveSmoothing {
  private lastCenterLinePoints: Map<string, SmoothPoint[]> = new Map()
  private transitionBuffer: SmoothPoint[] = []

  /**
   * Process target points with enhanced smoothing for center line interactions
   */
  public smoothTargetPoints(
    points: SmoothPoint[],
    centerLineY: number,
    graphWidth: number
  ): SmoothPoint[] {
    if (!points.length || Platform.OS !== 'android') return points

    const smoothedPoints: SmoothPoint[] = []
    const centerLineThreshold = 12 // Expanded threshold for center line detection

    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      const prevPoint = points[i - 1]
      const nextPoint = points[i + 1]

      // Check if this point is near the center line
      const isNearCenterLine = Math.abs(point.y - centerLineY) < centerLineThreshold

      if (isNearCenterLine) {
        // Apply specialized smoothing for center line interactions
        const smoothedPoint = this.applyCenterLineSmoothing(
          point,
          prevPoint,
          nextPoint,
          centerLineY,
          i / points.length // Progress through the note
        )
        smoothedPoints.push(smoothedPoint)
      } else {
        smoothedPoints.push(point)
      }
    }

    // Apply continuity smoothing to prevent abrupt transitions
    return this.applyContinuitySmoothing(smoothedPoints)
  }

  /**
   * Apply specialized smoothing for center line interactions
   */
  private applyCenterLineSmoothing(
    point: SmoothPoint,
    prevPoint: SmoothPoint | undefined,
    nextPoint: SmoothPoint | undefined,
    centerLineY: number,
    progress: number
  ): SmoothPoint {
    let adjustedY = point.y

    // Smooth approach to center line
    if (prevPoint && nextPoint) {
      const prevDistance = Math.abs(prevPoint.y - centerLineY)
      const nextDistance = Math.abs(nextPoint.y - centerLineY)
      const currentDistance = Math.abs(point.y - centerLineY)

      // If we're approaching the center line
      if (prevDistance > currentDistance && nextDistance > currentDistance) {
        // Apply gentle curve towards center
        const curveFactor = 1 - (currentDistance / 12)
        adjustedY = point.y + (centerLineY - point.y) * curveFactor * 0.3
      }

      // If we're leaving the center line
      else if (prevDistance < currentDistance && nextDistance < currentDistance) {
        // Apply gentle curve away from center
        const curveFactor = currentDistance / 12
        adjustedY = centerLineY + (point.y - centerLineY) * (0.7 + curveFactor * 0.3)
      }
    }

    // Add micro-variations to prevent static appearance
    const microVariation = Math.sin(point.x * 0.1) * 0.5
    adjustedY += microVariation

    return {
      ...point,
      y: adjustedY
    }
  }

  /**
   * Apply continuity smoothing to prevent abrupt transitions
   */
  private applyContinuitySmoothing(points: SmoothPoint[]): SmoothPoint[] {
    if (points.length < 3) return points

    const smoothed: SmoothPoint[] = [points[0]] // Keep first point

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1]
      const current = points[i]
      const next = points[i + 1]

      // Check for abrupt changes
      const prevDiff = Math.abs(current.y - prev.y)
      const nextDiff = Math.abs(next.y - current.y)

      if (prevDiff > 5 || nextDiff > 5) {
        // Apply smoothing using weighted average
        const smoothedY = (prev.y * 0.2 + current.y * 0.6 + next.y * 0.2)
        smoothed.push({
          ...current,
          y: smoothedY
        })
      } else {
        smoothed.push(current)
      }
    }

    smoothed.push(points[points.length - 1]) // Keep last point
    return smoothed
  }

  /**
   * Generate smooth transition points for note endings
   */
  public generateTransitionPoints(
    note: NoteInfo,
    frequency: number,
    centerLineY: number,
    freqToY: (freq: number) => number,
    elapsedMs: number
  ): SmoothPoint[] {
    const points: SmoothPoint[] = []
    const noteEndTime = note.startTime + note.duration
    const PIXELS_PER_MS = 60 / 1000

    // Generate transition points for the last 200ms of the note
    const transitionDuration = 200
    const startTransition = noteEndTime - transitionDuration

    for (let t = startTransition; t <= noteEndTime; t += 25) {
      const x = (t - elapsedMs) * PIXELS_PER_MS
      const progress = (t - startTransition) / transitionDuration

      let y = freqToY(frequency)

      // Apply smooth fade-out near center line
      if (Math.abs(y - centerLineY) < 15) {
        const fadeIntensity = Math.sin(progress * Math.PI) * 3
        y += fadeIntensity * (Math.random() - 0.5)
      }

      points.push({
        x,
        y,
        frequency,
        timestamp: Date.now()
      })
    }

    return points
  }
}

// Singleton instance for performance
export const targetWaveSmoothing = new TargetWaveSmoothing()
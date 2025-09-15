import React, { useMemo, useCallback, useRef, useEffect } from 'react'
import { Platform, InteractionManager } from 'react-native'
import { Canvas, Path, Skia, vec, Line, Circle, Group } from '@shopify/react-native-skia'
import { useAndroidPerformance } from '@/hooks/useAndroidPerformance'
import { getIOSLevelPerformanceSettings, ANDROID_PERFORMANCE_SETTINGS } from '@/utils/androidOptimization'

interface PitchPoint {
  x: number
  y: number
  frequency: number
  timestamp: number
}

interface NonBlockingGraphRendererProps {
  pitchPoints: PitchPoint[]
  targetPoints?: PitchPoint[]
  gridLines: { y: number, note: string }[]
  width: number
  height: number
  backgroundColor?: string
  centerLineY?: number
}

export const NonBlockingGraphRenderer: React.FC<NonBlockingGraphRendererProps> = ({
  pitchPoints,
  targetPoints = [],
  gridLines,
  width,
  height,
  backgroundColor = 'rgba(10,10,10,0.8)',
  centerLineY
}) => {
  const { getOptimizedValue, shouldReduceQuality } = useAndroidPerformance()
  const lastRenderTime = useRef<number>(0)
  const renderQueue = useRef<(() => void)[]>([])
  const isRendering = useRef<boolean>(false)

  // Enhanced render queue processing for iOS-level performance
  const processRenderQueue = useCallback(() => {
    if (isRendering.current || renderQueue.current.length === 0) return

    isRendering.current = true
    const task = renderQueue.current.shift()

    // Use immediate execution if throttling is disabled for iOS-level performance
    if (task && Platform.OS === 'android' && ANDROID_PERFORMANCE_SETTINGS.throttleUpdates) {
      InteractionManager.runAfterInteractions(() => {
        task()
        isRendering.current = false
        // Process next task faster for smoother performance
        setTimeout(processRenderQueue, 0)
      })
    } else if (task) {
      // Immediate execution for iOS-level responsiveness
      task()
      isRendering.current = false
      // Process next task immediately
      setTimeout(processRenderQueue, 0)
    }
  }, [])

  // Queue heavy rendering operations
  const queueRender = useCallback((renderFn: () => void) => {
    renderQueue.current.push(renderFn)
    processRenderQueue()
  }, [processRenderQueue])

  // Enhanced user pitch points processing - completely independent of target
  const optimizedPitchPoints = useMemo(() => {
    if (pitchPoints.length === 0) return []

    const now = Date.now()

    // Completely independent processing - no interference with target points
    const throttleMs = Platform.OS === 'android' ? 16 : 16 // Match iOS timing
    if (Platform.OS === 'android' && ANDROID_PERFORMANCE_SETTINGS.throttleUpdates &&
        (now - lastRenderTime.current) < throttleMs) {
      return pitchPoints
    }
    lastRenderTime.current = now

    let points = pitchPoints

    // Simplified processing - no collision detection with target
    if (shouldReduceQuality()) {
      // Keep every 2nd point for quality
      points = pitchPoints.filter((_, index) => index % 2 === 0)
    } else {
      // Keep all points for maximum smoothness - no filtering based on target proximity
      points = pitchPoints
    }

    // Higher capacity for smoother user graph regardless of target presence
    const maxPoints = getOptimizedValue(150, 100)
    if (points.length > maxPoints) {
      points = points.slice(-maxPoints)
    }

    return points
  }, [pitchPoints, shouldReduceQuality, getOptimizedValue])

  // Enhanced target points processing for iOS-level smoothness
  const optimizedTargetPoints = useMemo(() => {
    if (targetPoints.length === 0) return []

    // iOS-level target point processing - less aggressive reduction
    let points = targetPoints

    if (Platform.OS === 'android' && ANDROID_PERFORMANCE_SETTINGS.throttleUpdates) {
      // Only reduce if throttling is enabled
      points = targetPoints.filter((_, index) => index % 2 === 0) // Less aggressive
    }

    // iOS-level capacity for target points
    return points.slice(0, getOptimizedValue(150, 100)) // Increased for smoother target waves
  }, [targetPoints, getOptimizedValue])

  // Safe path creation with error recovery
  const createSafePath = useCallback((points: PitchPoint[], pathId: string) => {
    try {
      if (points.length === 0) return null

      const path = Skia.Path.Make()
      let validPointCount = 0

      points.forEach((point, index) => {
        if (!isFinite(point.x) || !isFinite(point.y)) return

        const clampedX = Math.max(0, Math.min(width, point.x))
        const clampedY = Math.max(0, Math.min(height, point.y))

        if (index === 0 || validPointCount === 0) {
          path.moveTo(clampedX, clampedY)
        } else {
          path.lineTo(clampedX, clampedY)
        }
        validPointCount++
      })

      return validPointCount > 1 ? path : null
    } catch (error) {
      console.warn(`Error creating path for ${pathId}:`, error)
      return null
    }
  }, [width, height])

  // Ultra-optimized user path - maximum performance for 60fps
  const userPath = useMemo(() => {
    if (optimizedPitchPoints.length === 0) return null

    try {
      const path = Skia.Path.Make()
      let validPointCount = 0

      // Ultra-fast path creation - minimal processing
      optimizedPitchPoints.forEach((point, index) => {
        if (!isFinite(point.x) || !isFinite(point.y)) return

        const clampedX = Math.max(0, Math.min(width, point.x))
        const clampedY = Math.max(0, Math.min(height, point.y))

        if (index === 0 || validPointCount === 0) {
          path.moveTo(clampedX, clampedY)
        } else {
          // Simple line segments for maximum performance - no curves
          path.lineTo(clampedX, clampedY)
        }
        validPointCount++
      })

      return validPointCount > 1 ? path : null
    } catch (error) {
      console.warn('Error creating user path:', error)
      return null
    }
  }, [optimizedPitchPoints, width, height])

  // Target path with special handling for center line interactions
  const targetPath = useMemo(() => {
    if (optimizedTargetPoints.length === 0) return null

    try {
      const path = Skia.Path.Make()
      let lastValidPoint: PitchPoint | null = null

      optimizedTargetPoints.forEach((point, index) => {
        if (!isFinite(point.x) || !isFinite(point.y)) return

        const clampedX = Math.max(0, Math.min(width, point.x))
        const clampedY = Math.max(0, Math.min(height, point.y))

        // Enhanced center line handling for completely smooth transitions
        if (centerLineY && Math.abs(clampedY - centerLineY) < 8) {
          // More sophisticated smoothing for center line interactions
          let smoothedY = clampedY

          if (lastValidPoint) {
            // Calculate smooth transition based on distance and direction
            const yDiff = clampedY - lastValidPoint.y
            const xDiff = clampedX - (lastValidPoint.x || clampedX)

            // Prevent abrupt stops by using gradual transitions
            if (Math.abs(yDiff) > 3 && xDiff > 0) {
              // Gradual approach to center line
              const transitionFactor = Math.min(xDiff / 20, 1) // Smooth over 20 pixels
              smoothedY = lastValidPoint.y + (yDiff * transitionFactor)
            } else if (Math.abs(yDiff) < 1) {
              // Very close to center - use micro-adjustments to prevent stuttering
              smoothedY = centerLineY + (Math.random() - 0.5) * 0.5 // Tiny random offset
            }
          }

          if (index === 0 || !lastValidPoint) {
            path.moveTo(clampedX, smoothedY)
          } else {
            // Always use smooth curves for center line transitions
            const controlX = (lastValidPoint.x + clampedX) / 2
            const controlY = (lastValidPoint.y + smoothedY) / 2
            path.quadTo(controlX, controlY, clampedX, smoothedY)
          }
          lastValidPoint = { ...point, x: clampedX, y: smoothedY }
        } else {
          // Regular rendering for non-center line points
          if (index === 0 || !lastValidPoint) {
            path.moveTo(clampedX, clampedY)
          } else {
            // Use curves for smoother overall appearance
            if (Math.abs(clampedY - lastValidPoint.y) > 2) {
              const controlX = (lastValidPoint.x + clampedX) / 2
              const controlY = (lastValidPoint.y + clampedY) / 2
              path.quadTo(controlX, controlY, clampedX, clampedY)
            } else {
              path.lineTo(clampedX, clampedY)
            }
          }
          lastValidPoint = { ...point, x: clampedX, y: clampedY }
        }
      })

      return path
    } catch (error) {
      console.warn('Error creating target path:', error)
      return null
    }
  }, [optimizedTargetPoints, createSafePath, width, height, centerLineY])

  // Enhanced grid rendering for iOS-level visual quality
  const gridElements = useMemo(() => {
    // iOS-level grid line count for better visual reference
    const maxGridLines = getOptimizedValue(8, 6) // Increased for better experience
    const visibleGridLines = gridLines.slice(0, maxGridLines)

    return visibleGridLines.map((grid, index) => (
      <Line
        key={`grid-${grid.note}-${index}`}
        p1={vec(0, grid.y)}
        p2={vec(width, grid.y)}
        color="rgba(255,255,255,0.1)" // Slightly more visible like iOS
        strokeWidth={0.4} // Slightly thicker for better visibility
      />
    ))
  }, [gridLines, width, getOptimizedValue])

  // Center line with special styling
  const centerLine = useMemo(() => {
    if (!centerLineY) return null

    return (
      <Line
        p1={vec(0, centerLineY)}
        p2={vec(width, centerLineY)}
        color="rgba(255,255,0,0.3)"
        strokeWidth={1}
      />
    )
  }, [centerLineY, width])

  // Current note indicator (simplified for performance)
  const currentNoteIndicator = useMemo(() => {
    if (shouldReduceQuality() || optimizedPitchPoints.length === 0) return null

    const lastPoint = optimizedPitchPoints[optimizedPitchPoints.length - 1]
    if (!lastPoint || !isFinite(lastPoint.x) || !isFinite(lastPoint.y)) return null

    return (
      <Circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r={getOptimizedValue(3, 2)}
        color="#00ff00"
        opacity={0.8}
      />
    )
  }, [optimizedPitchPoints, shouldReduceQuality, getOptimizedValue])

  // Background with optimized fills
  const backgroundRect = useMemo(() => {
    return Skia.Path.MakeFromRect({ x: 0, y: 0, width, height })
  }, [width, height])

  // Ultra-optimized rendering for maximum frame rate
  return (
    <Canvas style={{ width, height }}>
      {/* Background - minimal overhead */}
      <Path path={backgroundRect} color={backgroundColor} />

      {/* Grid - reduced complexity */}
      {gridElements.slice(0, 4)} {/* Limit grid lines for performance */}
      {centerLine}

      {/* Target path - simplified rendering */}
      {targetPath && (
        <Path
          path={targetPath}
          style="stroke"
          strokeWidth={2}
          color="rgba(255,255,0,0.6)"
        />
      )}

      {/* User path - maximum priority, minimal overhead */}
      {userPath && (
        <Path
          path={userPath}
          style="stroke"
          strokeWidth={3}
          color="#00ff00"
        />
      )}

      {/* Current note indicator - only if not reducing quality */}
      {!shouldReduceQuality() && currentNoteIndicator}
    </Canvas>
  )
}
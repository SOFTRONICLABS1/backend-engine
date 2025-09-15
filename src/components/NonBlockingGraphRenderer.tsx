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

  // iOS-level pitch points processing - enhanced for smoothness
  const optimizedPitchPoints = useMemo(() => {
    if (pitchPoints.length === 0) return []

    const now = Date.now()
    const iosLevelSettings = getIOSLevelPerformanceSettings()

    // Use iOS-level timing for consistent performance
    const throttleMs = Platform.OS === 'android' ? 25 : 16 // Faster refresh like iOS
    if (Platform.OS === 'android' && ANDROID_PERFORMANCE_SETTINGS.throttleUpdates &&
        (now - lastRenderTime.current) < throttleMs) {
      return pitchPoints
    }
    lastRenderTime.current = now

    let points = pitchPoints

    // iOS-level point processing - less aggressive reduction
    if (shouldReduceQuality()) {
      // Keep every 2nd point instead of 4th for better quality
      points = pitchPoints.filter((_, index) => index % 2 === 0)
    } else if (Platform.OS === 'android') {
      // Less aggressive filtering to match iOS smoothness
      points = []
      let lastKeptPoint: PitchPoint | null = null

      // Keep more points for smoother lines
      for (let i = 0; i < pitchPoints.length; i++) {
        const point = pitchPoints[i]

        // Keep points that are less dramatically different (smoother)
        if (!lastKeptPoint || Math.abs(point.y - lastKeptPoint.y) > 2) {
          points.push(point)
          lastKeptPoint = point
        }
      }
    }

    // iOS-level point capacity
    const maxPoints = getOptimizedValue(120, 80) // Increased for better quality
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

  // User path with non-blocking creation
  const userPath = useMemo(() => {
    return createSafePath(optimizedPitchPoints, 'user')
  }, [optimizedPitchPoints, createSafePath])

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

        // Special handling near center line to prevent lag
        if (centerLineY && Math.abs(clampedY - centerLineY) < 5) {
          // Smooth out points near center line
          const smoothedY = lastValidPoint ?
            (lastValidPoint.y + clampedY) / 2 : clampedY

          if (index === 0 || !lastValidPoint) {
            path.moveTo(clampedX, smoothedY)
          } else {
            path.lineTo(clampedX, smoothedY)
          }
          lastValidPoint = { ...point, y: smoothedY }
        } else {
          if (index === 0 || !lastValidPoint) {
            path.moveTo(clampedX, clampedY)
          } else {
            path.lineTo(clampedX, clampedY)
          }
          lastValidPoint = { ...point, y: clampedY }
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

  // Render in groups to improve performance
  return (
    <Canvas style={{ width, height }}>
      {/* Background */}
      <Path path={backgroundRect} color={backgroundColor} />

      {/* Grid group - lowest priority */}
      <Group>
        {gridElements}
        {centerLine}
      </Group>

      {/* Target path group - medium priority */}
      {targetPath && (
        <Group>
          <Path
            path={targetPath}
            style="stroke"
            strokeWidth={getOptimizedValue(2, 1)}
            color="rgba(255,255,0,0.5)"
            opacity={0.7}
          />
        </Group>
      )}

      {/* User path group - highest priority */}
      {userPath && (
        <Group>
          <Path
            path={userPath}
            style="stroke"
            strokeWidth={getOptimizedValue(2, 1)}
            color="#00ff00"
            opacity={0.9}
          />
          {currentNoteIndicator}
        </Group>
      )}
    </Canvas>
  )
}
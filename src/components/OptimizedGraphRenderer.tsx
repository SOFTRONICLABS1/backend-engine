import React, { useMemo, useCallback, useRef } from 'react'
import { Platform, InteractionManager } from 'react-native'
import { Canvas, Path, Skia, vec, Line, Circle } from '@shopify/react-native-skia'
import { useAndroidPerformance } from '@/hooks/useAndroidPerformance'

interface PitchPoint {
  x: number
  y: number
  frequency: number
  timestamp: number
}

interface OptimizedGraphRendererProps {
  pitchPoints: PitchPoint[]
  targetPoints?: PitchPoint[]
  gridLines: { y: number, note: string }[]
  width: number
  height: number
  backgroundColor?: string
}

export const OptimizedGraphRenderer: React.FC<OptimizedGraphRendererProps> = ({
  pitchPoints,
  targetPoints = [],
  gridLines,
  width,
  height,
  backgroundColor = 'rgba(10,10,10,0.8)'
}) => {
  const { getOptimizedValue, shouldReduceQuality } = useAndroidPerformance()
  const lastRenderTime = useRef<number>(0)

  // Optimize point density based on performance
  const optimizedPitchPoints = useMemo(() => {
    if (pitchPoints.length === 0) return []

    const now = Date.now()

    // Throttle rendering updates on Android
    if (Platform.OS === 'android' && (now - lastRenderTime.current) < 33) { // ~30fps max
      return pitchPoints
    }
    lastRenderTime.current = now

    let points = pitchPoints

    // Reduce point density for performance
    if (shouldReduceQuality()) {
      // Keep every 3rd point on low performance
      points = pitchPoints.filter((_, index) => index % 3 === 0)
    } else if (Platform.OS === 'android') {
      // Keep every 2nd point on Android
      points = pitchPoints.filter((_, index) => index % 2 === 0)
    }

    // Keep only recent points to prevent memory issues
    const maxPoints = getOptimizedValue(100, 50)
    if (points.length > maxPoints) {
      points = points.slice(-maxPoints)
    }

    return points
  }, [pitchPoints, shouldReduceQuality, getOptimizedValue])

  // Optimized path creation with error handling
  const userPath = useMemo(() => {
    try {
      if (optimizedPitchPoints.length === 0) return null

      const path = Skia.Path.Make()

      // Use batch operations for better performance
      const pathCommands: Array<{ type: 'move' | 'line', x: number, y: number }> = []

      optimizedPitchPoints.forEach((point, index) => {
        if (!isFinite(point.x) || !isFinite(point.y)) return

        pathCommands.push({
          type: index === 0 ? 'move' : 'line',
          x: Math.max(0, Math.min(width, point.x)),
          y: Math.max(0, Math.min(height, point.y))
        })
      })

      // Execute path commands in batch
      pathCommands.forEach(({ type, x, y }) => {
        if (type === 'move') {
          path.moveTo(x, y)
        } else {
          path.lineTo(x, y)
        }
      })

      return path
    } catch (error) {
      console.warn('Error creating user path:', error)
      return null
    }
  }, [optimizedPitchPoints, width, height])

  // Simplified target path rendering
  const targetPath = useMemo(() => {
    try {
      if (targetPoints.length === 0) return null

      const path = Skia.Path.Make()
      let hasMoveTo = false

      targetPoints.forEach((point) => {
        if (!isFinite(point.x) || !isFinite(point.y)) return

        const clampedX = Math.max(0, Math.min(width, point.x))
        const clampedY = Math.max(0, Math.min(height, point.y))

        if (!hasMoveTo) {
          path.moveTo(clampedX, clampedY)
          hasMoveTo = true
        } else {
          path.lineTo(clampedX, clampedY)
        }
      })

      return path
    } catch (error) {
      console.warn('Error creating target path:', error)
      return null
    }
  }, [targetPoints, width, height])

  // Optimized grid rendering
  const gridElements = useMemo(() => {
    const maxGridLines = getOptimizedValue(8, 4)
    const visibleGridLines = gridLines.slice(0, maxGridLines)

    return visibleGridLines.map((grid, index) => (
      <Line
        key={`grid-${grid.note}-${index}`}
        p1={vec(0, grid.y)}
        p2={vec(width, grid.y)}
        color="rgba(255,255,255,0.1)"
        strokeWidth={0.5}
      />
    ))
  }, [gridLines, width, getOptimizedValue])

  // Current note indicator (only show if not reducing quality)
  const currentNoteIndicator = useMemo(() => {
    if (shouldReduceQuality() || optimizedPitchPoints.length === 0) return null

    const lastPoint = optimizedPitchPoints[optimizedPitchPoints.length - 1]
    if (!lastPoint || !isFinite(lastPoint.x) || !isFinite(lastPoint.y)) return null

    return (
      <Circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r={getOptimizedValue(4, 2)}
        color="#00ff00"
      />
    )
  }, [optimizedPitchPoints, shouldReduceQuality, getOptimizedValue])

  // Defer rendering on Android to prevent hangs
  const deferredRender = useCallback((renderContent: () => React.ReactNode) => {
    if (Platform.OS === 'android') {
      // Use InteractionManager to defer rendering after current interactions
      InteractionManager.runAfterInteractions(() => {
        return renderContent()
      })
      return renderContent() // Still return immediately but also schedule deferred
    }
    return renderContent()
  }, [])

  return (
    <Canvas style={{ width, height }}>
      {deferredRender(() => (
        <>
          {/* Background */}
          <Path
            path={Skia.Path.MakeFromRect({ x: 0, y: 0, width, height })}
            color={backgroundColor}
          />

          {/* Grid lines */}
          {gridElements}

          {/* Target path (if exists) */}
          {targetPath && (
            <Path
              path={targetPath}
              style="stroke"
              strokeWidth={getOptimizedValue(3, 2)}
              color="rgba(255,255,0,0.6)"
            />
          )}

          {/* User pitch path */}
          {userPath && (
            <Path
              path={userPath}
              style="stroke"
              strokeWidth={getOptimizedValue(2, 1)}
              color="#00ff00"
            />
          )}

          {/* Current note indicator */}
          {currentNoteIndicator}
        </>
      ))}
    </Canvas>
  )
}
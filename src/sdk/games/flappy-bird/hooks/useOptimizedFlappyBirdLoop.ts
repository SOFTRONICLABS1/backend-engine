import { useEffect, useRef, useCallback } from 'react'
import { Platform, InteractionManager } from 'react-native'
import { useAndroidPerformance } from '@/hooks/useAndroidPerformance'

interface GameLoopActions {
  updateBird: () => void
  updatePipes: () => void
  updateBackground: () => void
  checkCollision: () => void
  generatePipe?: () => any
}

interface OptimizedGameLoopConfig {
  gameState: string
  actions: GameLoopActions
  pipeGenerationInterval?: number
}

export const useOptimizedFlappyBirdLoop = ({
  gameState,
  actions,
  pipeGenerationInterval = 2000,
}: OptimizedGameLoopConfig) => {
  const gameLoopRef = useRef<number | null>(null)
  const pipeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const frameCountRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)

  const { throttledUpdate, shouldReduceQuality, currentFPS } = useAndroidPerformance({
    enableThrottling: Platform.OS === 'android',
    throttleMs: 16,
    prioritizeAudio: true,
  })

  // Adaptive frame rate based on performance
  const getTargetFrameRate = useCallback(() => {
    if (Platform.OS !== 'android') return 60

    if (currentFPS < 25) return 20
    if (currentFPS < 40) return 30
    return 60
  }, [currentFPS])

  // Optimized game loop with adaptive timing
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return

    const now = performance.now()
    const deltaTime = now - lastFrameTimeRef.current
    const targetFrameTime = 1000 / getTargetFrameRate()

    // Skip frame if we're running too fast (frame rate limiting)
    if (deltaTime < targetFrameTime - 1) {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
      return
    }

    lastFrameTimeRef.current = now
    frameCountRef.current++

    // Update game components with different priorities
    try {
      // High priority: Bird physics (always update)
      actions.updateBird()

      // Medium priority: Collision detection
      actions.checkCollision()

      // Lower priority: Pipes (can be throttled)
      if (Platform.OS === 'android' && shouldReduceQuality()) {
        // Update pipes every other frame on low-performance devices
        if (frameCountRef.current % 2 === 0) {
          throttledUpdate(actions.updatePipes)
        }
      } else {
        actions.updatePipes()
      }

      // Lowest priority: Background (can be heavily throttled)
      if (Platform.OS === 'android' && shouldReduceQuality()) {
        // Update background every 4th frame on low-performance devices
        if (frameCountRef.current % 4 === 0) {
          throttledUpdate(actions.updateBackground)
        }
      } else {
        actions.updateBackground()
      }

    } catch (error) {
      console.error('Game loop error:', error)
    }

    // Schedule next frame
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [gameState, actions, getTargetFrameRate, shouldReduceQuality, throttledUpdate])

  // Optimized pipe generation with adaptive timing
  const startPipeGeneration = useCallback(() => {
    if (pipeTimerRef.current) {
      clearInterval(pipeTimerRef.current)
    }

    // Adjust pipe generation rate based on performance
    let interval = pipeGenerationInterval
    if (Platform.OS === 'android' && shouldReduceQuality()) {
      interval = pipeGenerationInterval * 1.5 // Generate pipes less frequently
    }

    pipeTimerRef.current = setInterval(() => {
      if (gameState === 'playing' && actions.generatePipe) {
        // Use InteractionManager to defer pipe generation if needed
        if (Platform.OS === 'android') {
          InteractionManager.runAfterInteractions(() => {
            const newPipe = actions.generatePipe?.()
            if (newPipe) {
              // Add pipe logic would go here
            }
          })
        } else {
          actions.generatePipe()
        }
      }
    }, interval)
  }, [gameState, actions.generatePipe, pipeGenerationInterval, shouldReduceQuality])

  const stopPipeGeneration = useCallback(() => {
    if (pipeTimerRef.current) {
      clearInterval(pipeTimerRef.current)
      pipeTimerRef.current = null
    }
  }, [])

  // Main game loop control
  useEffect(() => {
    if (gameState === 'playing') {
      lastFrameTimeRef.current = performance.now()
      frameCountRef.current = 0
      gameLoop()
      startPipeGeneration()
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
        gameLoopRef.current = null
      }
      stopPipeGeneration()
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
        gameLoopRef.current = null
      }
      stopPipeGeneration()
    }
  }, [gameState, gameLoop, startPipeGeneration, stopPipeGeneration])

  // Performance monitoring
  const getPerformanceInfo = useCallback(() => {
    return {
      currentFPS,
      targetFPS: getTargetFrameRate(),
      isOptimized: Platform.OS === 'android',
      qualityMode: shouldReduceQuality() ? 'performance' : 'quality',
      frameCount: frameCountRef.current,
    }
  }, [currentFPS, getTargetFrameRate, shouldReduceQuality])

  return {
    getPerformanceInfo,
    isRunning: gameState === 'playing',
  }
}
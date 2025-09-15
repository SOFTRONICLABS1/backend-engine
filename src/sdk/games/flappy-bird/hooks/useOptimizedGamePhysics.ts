import { useCallback, useRef } from 'react'
import { useWindowDimensions, Platform } from 'react-native'
import { useAndroidPerformance } from '@/hooks/useAndroidPerformance'
import { Bird, Pipe } from './useGameState'

interface GamePhysicsParams {
  bird: Bird
  pipes: Pipe[]
  setBird: (bird: Bird | ((prev: Bird) => Bird)) => void
  setPipes: (pipes: Pipe[] | ((prev: Pipe[]) => Pipe[])) => void
  setScore: (score: number | ((prev: number) => number)) => void
  setBackgroundOffset: (offset: number | ((prev: number) => number)) => void
  triggerDeathAnimation: () => void
}

// Android-optimized physics constants
const getPhysicsConfig = (shouldReduceQuality: boolean) => {
  const isAndroid = Platform.OS === 'android'

  return {
    GRAVITY: isAndroid ? 0.5 : 0.6, // Slightly reduced for smoother Android performance
    JUMP_STRENGTH: isAndroid ? -10 : -12,
    PIPE_WIDTH: 60,
    PIPE_GAP: isAndroid ? 180 : 200, // Slightly smaller gap for easier gameplay on lower performance
    PIPE_SPEED: shouldReduceQuality ? 2 : (isAndroid ? 2.5 : 3),
    BACKGROUND_SPEED: shouldReduceQuality ? 0.5 : 1,
    BIRD_SIZE: 40,
    MAX_PIPES: isAndroid ? 3 : 4, // Limit pipes on Android
  }
}

export const useOptimizedGamePhysics = ({
  bird,
  pipes,
  setBird,
  setPipes,
  setScore,
  setBackgroundOffset,
  triggerDeathAnimation,
}: GamePhysicsParams) => {
  const { width, height } = useWindowDimensions()
  const { throttledUpdate, shouldReduceQuality, getOptimizedValue } = useAndroidPerformance({
    enableThrottling: Platform.OS === 'android',
    throttleMs: 16, // Target 60fps, but will adapt
    prioritizeAudio: true,
  })

  const physicsConfig = getPhysicsConfig(shouldReduceQuality())
  const lastUpdateTime = useRef<number>(0)

  // Optimized jump with reduced processing
  const jump = useCallback(() => {
    throttledUpdate(() => {
      setBird(prevBird => ({
        ...prevBird,
        velocity: physicsConfig.JUMP_STRENGTH
      }))
    })
  }, [setBird, physicsConfig.JUMP_STRENGTH, throttledUpdate])

  // Optimized bird physics with collision batching
  const updateBird = useCallback(() => {
    const now = Date.now()

    // Throttle updates on Android for performance
    if (Platform.OS === 'android' && (now - lastUpdateTime.current) < 16) {
      return
    }
    lastUpdateTime.current = now

    setBird(prevBird => {
      const newVelocity = prevBird.velocity + physicsConfig.GRAVITY
      const newY = prevBird.y + newVelocity

      // Batch collision checks for better performance
      const hitGround = newY > height - physicsConfig.BIRD_SIZE
      const hitCeiling = newY < 0

      if (hitGround || hitCeiling) {
        triggerDeathAnimation()
        return prevBird
      }

      return {
        ...prevBird,
        y: newY,
        velocity: newVelocity
      }
    })
  }, [setBird, height, physicsConfig, triggerDeathAnimation])

  // Optimized pipe updates with reduced operations
  const updatePipes = useCallback(() => {
    throttledUpdate(() => {
      setPipes(prevPipes => {
        // Early exit if no pipes
        if (prevPipes.length === 0) return prevPipes

        const newPipes = prevPipes.map(pipe => ({
          ...pipe,
          x: pipe.x - physicsConfig.PIPE_SPEED
        }))

        // More efficient filtering
        const visiblePipes = newPipes.filter(pipe => pipe.x > -physicsConfig.PIPE_WIDTH)

        // Batch score updates
        let scoreIncrease = 0
        visiblePipes.forEach(pipe => {
          if (!pipe.passed && pipe.x + physicsConfig.PIPE_WIDTH < bird.x) {
            pipe.passed = true
            scoreIncrease++
          }
        })

        if (scoreIncrease > 0) {
          setScore(prev => prev + scoreIncrease)
        }

        return visiblePipes
      })
    })
  }, [setPipes, setScore, physicsConfig, bird.x, throttledUpdate])

  // Simplified background update for Android
  const updateBackground = useCallback(() => {
    if (Platform.OS === 'android' && shouldReduceQuality()) {
      // Reduce background animation frequency on low-performance devices
      const shouldUpdate = Math.random() > 0.3
      if (!shouldUpdate) return
    }

    setBackgroundOffset(prev => {
      const newOffset = prev + physicsConfig.BACKGROUND_SPEED
      return newOffset >= width ? 0 : newOffset
    })
  }, [setBackgroundOffset, physicsConfig.BACKGROUND_SPEED, width, shouldReduceQuality])

  // Optimized pipe generation with memory management
  const generatePipe = useCallback(() => {
    // Limit pipe count on Android
    if (pipes.length >= physicsConfig.MAX_PIPES) {
      return null
    }

    const minHeight = getOptimizedValue(50, 80) // Larger min height on low-performance devices
    const maxHeight = height - physicsConfig.PIPE_GAP - minHeight
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight

    const newPipe: Pipe = {
      id: Date.now(),
      x: width,
      topHeight,
      bottomY: topHeight + physicsConfig.PIPE_GAP,
      passed: false,
    }

    return newPipe
  }, [height, width, physicsConfig, pipes.length, getOptimizedValue])

  // Optimized collision detection with reduced precision for Android
  const checkCollision = useCallback(() => {
    const birdLeft = bird.x
    const birdRight = bird.x + physicsConfig.BIRD_SIZE
    const birdTop = bird.y
    const birdBottom = bird.y + physicsConfig.BIRD_SIZE

    // Use simplified collision detection on Android
    const collisionPadding = Platform.OS === 'android' ? 5 : 0

    for (const pipe of pipes) {
      const pipeLeft = pipe.x
      const pipeRight = pipe.x + physicsConfig.PIPE_WIDTH

      // Check if bird is in pipe's horizontal range
      if (birdRight + collisionPadding > pipeLeft && birdLeft - collisionPadding < pipeRight) {
        // Check vertical collision with top pipe
        if (birdTop - collisionPadding < pipe.topHeight) {
          triggerDeathAnimation()
          return
        }
        // Check vertical collision with bottom pipe
        if (birdBottom + collisionPadding > pipe.bottomY) {
          triggerDeathAnimation()
          return
        }
      }
    }
  }, [bird, pipes, physicsConfig, triggerDeathAnimation])

  return {
    actions: {
      jump,
      updateBird,
      updatePipes,
      updateBackground,
      generatePipe,
      checkCollision,
    },
    config: physicsConfig,
    performance: {
      isOptimized: Platform.OS === 'android',
      shouldReduceQuality: shouldReduceQuality(),
      currentMode: shouldReduceQuality() ? 'performance' : 'quality',
    }
  }
}
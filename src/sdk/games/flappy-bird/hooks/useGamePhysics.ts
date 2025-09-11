import { useCallback } from 'react'
import { useWindowDimensions } from 'react-native'
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

export const useGamePhysics = ({
  bird,
  pipes,
  setBird,
  setPipes,
  setScore,
  setBackgroundOffset,
  triggerDeathAnimation,
}: GamePhysicsParams) => {
  const { width, height } = useWindowDimensions()

  // Game constants
  const GRAVITY = 0.6
  const JUMP_STRENGTH = -12
  const PIPE_WIDTH = 60
  const PIPE_GAP = 200
  const PIPE_SPEED = 3
  const BACKGROUND_SPEED = 1
  const BIRD_SIZE = 40

  const jump = useCallback(() => {
    setBird(prevBird => ({
      ...prevBird,
      velocity: JUMP_STRENGTH
    }))
  }, [setBird])

  const updateBird = useCallback(() => {
    setBird(prevBird => {
      const newVelocity = prevBird.velocity + GRAVITY
      const newY = prevBird.y + newVelocity
      
      // Check ground collision
      if (newY > height - BIRD_SIZE) {
        triggerDeathAnimation()
        return prevBird
      }
      
      // Check ceiling collision
      if (newY < 0) {
        triggerDeathAnimation()
        return prevBird
      }
      
      return {
        ...prevBird,
        y: newY,
        velocity: newVelocity
      }
    })
  }, [setBird, height, BIRD_SIZE, triggerDeathAnimation])

  const updatePipes = useCallback(() => {
    setPipes(prevPipes => {
      const newPipes = prevPipes.map(pipe => ({
        ...pipe,
        x: pipe.x - PIPE_SPEED
      }))
      
      // Remove pipes that are off screen
      const visiblePipes = newPipes.filter(pipe => pipe.x > -PIPE_WIDTH)
      
      // Check for score updates
      visiblePipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
          pipe.passed = true
          setScore(prev => prev + 1)
        }
      })
      
      return visiblePipes
    })
  }, [setPipes, setScore, PIPE_SPEED, PIPE_WIDTH, bird.x])

  const updateBackground = useCallback(() => {
    setBackgroundOffset(prev => {
      const newOffset = prev + BACKGROUND_SPEED
      return newOffset >= width ? 0 : newOffset
    })
  }, [setBackgroundOffset, BACKGROUND_SPEED, width])

  const generatePipe = useCallback(() => {
    const minHeight = 50
    const maxHeight = height - PIPE_GAP - minHeight
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight
    
    const newPipe: Pipe = {
      id: Date.now(),
      x: width,
      topHeight,
      bottomY: topHeight + PIPE_GAP,
      width: PIPE_WIDTH,
      passed: false
    }
    
    setPipes(prevPipes => [...prevPipes, newPipe])
  }, [setPipes, width, height, PIPE_GAP, PIPE_WIDTH])

  const checkCollision = useCallback(() => {
    const birdLeft = bird.x
    const birdRight = bird.x + BIRD_SIZE
    const birdTop = bird.y
    const birdBottom = bird.y + BIRD_SIZE
    
    for (const pipe of pipes) {
      const pipeLeft = pipe.x
      const pipeRight = pipe.x + pipe.width
      
      // Check if bird is in horizontal range of pipe
      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        // Check collision with top pipe
        if (birdTop < pipe.topHeight) {
          triggerDeathAnimation()
          return true
        }
        // Check collision with bottom pipe
        if (birdBottom > pipe.bottomY) {
          triggerDeathAnimation()
          return true
        }
      }
    }
    
    return false
  }, [bird, pipes, BIRD_SIZE, triggerDeathAnimation])

  return {
    constants: {
      GRAVITY,
      JUMP_STRENGTH,
      PIPE_WIDTH,
      PIPE_GAP,
      PIPE_SPEED,
      BACKGROUND_SPEED,
      BIRD_SIZE,
    },
    actions: {
      jump,
      updateBird,
      updatePipes,
      updateBackground,
      generatePipe,
      checkCollision,
    }
  }
}
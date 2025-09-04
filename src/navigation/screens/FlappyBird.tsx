import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { View, useWindowDimensions, TouchableOpacity, Text, StyleSheet, Platform } from "react-native"
import { Canvas, Rect, Circle, Fill, Text as SkiaText, Group, matchFont } from "@shopify/react-native-skia"
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useGlobalPitchDetection } from "@/hooks/useGlobalPitchDetection"
import { NOTE_FREQUENCIES } from "@/utils/noteParser"

// Create system font
const systemFont = matchFont({
  fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'Arial',
  fontSize: 14,
  fontStyle: 'normal',
  fontWeight: 'bold',
})

// Game constants
const GRAVITY = 0.5
const BIRD_SIZE = 20
const PIPE_WIDTH_BASE = 60
const GAME_SPEED_BASE = 2
const NOTE_CIRCLE_RADIUS = 22 // Fixed size for note label circles
const NOTE_TEXT_OFFSET_X = -8 // Fixed X offset for note text
const NOTE_TEXT_OFFSET_Y = 4 // Fixed Y offset for note text

// Difficulty settings
const DIFFICULTY_SETTINGS = {
  easy: { 
    initialFrequencyTolerance: 24, // +/- 24Hz at start
    minFrequencyTolerance: 10, // +/- 10Hz minimum
    minGap: 8, // minimum gap reduction in easy mode
    initialGap: 20
  },
  medium: { 
    frequencyTolerance: 16, // +/- 16Hz
    minGap: 16,
    initialGap: 16
  },
  hard: { 
    frequencyTolerance: 12, // +/- 12Hz
    minGap: 12,
    initialGap: 12
  }
}

// BPM settings
const BPM_SETTINGS = {
  20: { speed: 0.5, notesPerSec: 1/3 },
  40: { speed: 1, notesPerSec: 2/3 },
  60: { speed: 1.5, notesPerSec: 1 },
  120: { speed: 3, notesPerSec: 2 }
}

interface Note {
  frequency: number
  duration: number // in seconds
  name: string
}

interface Pipe {
  id: number
  x: number
  topHeight: number
  bottomY: number
  width: number
  note: Note
  passed: boolean
}

interface Bird {
  x: number
  y: number
  velocity: number
}

type Difficulty = 'easy' | 'medium' | 'hard'
type BPM = 20 | 40 | 60 | 120

export const FlappyBird = () => {
  const { width, height } = useWindowDimensions()
  const navigation = useNavigation()
  const { pitch, isActive, micAccess } = useGlobalPitchDetection()
  
  // Game state
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu')
  const [bird, setBird] = useState<Bird>({ x: width * 0.2, y: height / 2, velocity: 0 })
  const [pipes, setPipes] = useState<Pipe[]>([])
  const [score, setScore] = useState(0)
  const [cycle, setCycle] = useState(0) // Track cycles in easy mode
  const [currentTolerance, setCurrentTolerance] = useState(24) // Current frequency tolerance
  
  // Settings
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [bpm, setBpm] = useState<BPM>(60)
  
  // Game mechanics
  const gameLoopRef = useRef<number>()
  const lastNoteTime = useRef<number>(0)
  const pipeIdCounter = useRef(0)
  const gameStartTime = useRef<number>(0)
  
  // Default note sequence: C3,D3, E3, F3, G3, A3, B3, C4, B3, A3, G3, F3, E3, D3, C3
  const noteSequence: Note[] = useMemo(() => [
    { frequency: NOTE_FREQUENCIES['C3'], duration: 800, name: 'C3' },   // 800ms
    { frequency: NOTE_FREQUENCIES['D3'], duration: 600, name: 'D3' },   // 600ms
    { frequency: NOTE_FREQUENCIES['E3'], duration: 1000, name: 'E3' },  // 1000ms
    { frequency: NOTE_FREQUENCIES['F3'], duration: 750, name: 'F3' },   // 750ms
    { frequency: NOTE_FREQUENCIES['G3'], duration: 900, name: 'G3' },   // 900ms
    { frequency: NOTE_FREQUENCIES['A3'], duration: 500, name: 'A3' },   // 500ms
    { frequency: NOTE_FREQUENCIES['B3'], duration: 1200, name: 'B3' },  // 1200ms
    { frequency: NOTE_FREQUENCIES['C4'], duration: 1000, name: 'C4' },  // 1000ms
    { frequency: NOTE_FREQUENCIES['B3'], duration: 700, name: 'B3' },   // 700ms
    { frequency: NOTE_FREQUENCIES['A3'], duration: 800, name: 'A3' },   // 800ms
    { frequency: NOTE_FREQUENCIES['G3'], duration: 600, name: 'G3' },   // 600ms
    { frequency: NOTE_FREQUENCIES['F3'], duration: 1100, name: 'F3' },  // 1100ms
    { frequency: NOTE_FREQUENCIES['E3'], duration: 900, name: 'E3' },   // 900ms
    { frequency: NOTE_FREQUENCIES['D3'], duration: 750, name: 'D3' },   // 750ms
    { frequency: NOTE_FREQUENCIES['C3'], duration: 1000, name: 'C3' },  // 1000ms
  ], [])
  
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  
  // Calculate current gap size based on difficulty and cycle (for easy mode)
  const getCurrentGapSize = useCallback(() => {
    const settings = DIFFICULTY_SETTINGS[difficulty]
    if (difficulty === 'easy') {
      const reduction = Math.min(cycle, settings.initialGap - settings.minGap)
      return Math.max(settings.minGap, settings.initialGap - reduction)
    }
    return settings.initialGap
  }, [difficulty, cycle])
  
  // Update tolerance when difficulty changes (for menu selection)
  useEffect(() => {
    if (gameState === 'menu') {
      if (difficulty === 'easy') {
        setCurrentTolerance(DIFFICULTY_SETTINGS[difficulty].initialFrequencyTolerance)
      } else {
        setCurrentTolerance(DIFFICULTY_SETTINGS[difficulty].frequencyTolerance)
      }
    }
  }, [difficulty, gameState])
  
  // Update tolerance when cycle changes (only in easy mode during gameplay)
  useEffect(() => {
    if (gameState === 'playing') {
      if (difficulty === 'easy') {
        const settings = DIFFICULTY_SETTINGS[difficulty]
        // Reduce tolerance by 1Hz per completed cycle
        const reduction = cycle
        const newTolerance = settings.initialFrequencyTolerance - reduction
        setCurrentTolerance(Math.max(settings.minFrequencyTolerance, newTolerance))
      } else {
        // For medium and hard modes, tolerance should never change
        setCurrentTolerance(DIFFICULTY_SETTINGS[difficulty].frequencyTolerance)
      }
    }
  }, [cycle, gameState, difficulty])
  
  // Convert frequency to Y position on screen
  const frequencyToY = useCallback((freq: number) => {
    // Map frequency range (80Hz to 1000Hz) to screen height
    const minFreq = 80
    const maxFreq = 1000
    const clampedFreq = Math.max(minFreq, Math.min(maxFreq, freq))
    const normalized = (Math.log2(clampedFreq) - Math.log2(minFreq)) / (Math.log2(maxFreq) - Math.log2(minFreq))
    return height * 0.9 - (normalized * height * 0.8) + height * 0.1
  }, [height])
  
  // Create a new pipe based on current note
  const createPipe = useCallback(() => {
    const note = noteSequence[currentNoteIndex % noteSequence.length]
    // Calculate gap based on note frequency and current difficulty tolerance
    const noteFrequency = note.frequency
    
    // Calculate frequency range for the gap (note frequency ± tolerance)
    const minFreq = noteFrequency - currentTolerance
    const maxFreq = noteFrequency + currentTolerance
    
    // Convert frequency range to Y positions (inverted: higher freq = lower Y)
    const topOfGap = frequencyToY(maxFreq) // Higher frequency = top of gap
    const bottomOfGap = frequencyToY(minFreq) // Lower frequency = bottom of gap
    
    // Calculate BPM-adjusted base width
    const bpmSettings = BPM_SETTINGS[bpm]
    const bpmAdjustedBase = PIPE_WIDTH_BASE / bpmSettings.speed
    
    // Calculate pipe width based on duration
    const durationInSeconds = note.duration / 1000
    const pipeWidth = bpmAdjustedBase * durationInSeconds
    
    // Pipe heights: top pipe goes from 0 to top of gap, bottom pipe goes from bottom of gap to screen bottom
    const topHeight = topOfGap
    const bottomY = bottomOfGap
    
    const pipe: Pipe = {
      id: pipeIdCounter.current++,
      x: width,
      topHeight: Math.max(0, topHeight),
      bottomY: Math.min(height, bottomY),
      width: pipeWidth,
      note: note,
      passed: false
    }
    
    setCurrentNoteIndex(prev => prev + 1)
    return pipe
  }, [currentNoteIndex, noteSequence, frequencyToY, currentTolerance, width, height, bpm])
  
  // Track pitch detection for continuous flying
  const isPitchDetectedRef = useRef<boolean>(false)
  const lastPitchTimeRef = useRef<number>(0)
  
  // Handle bird flying based on pitch detection using centralized pitch data
  useEffect(() => {
    if (gameState !== 'playing' || !isActive) return
    
    const currentTime = Date.now()
    
    // Check if we have valid pitch (any frequency detected)
    if (pitch > 0) {
      isPitchDetectedRef.current = true
      lastPitchTimeRef.current = currentTime
    } else {
      // If no pitch for more than 200ms, stop flying
      if (currentTime - lastPitchTimeRef.current > 200) {
        isPitchDetectedRef.current = false
      }
    }
  }, [pitch, isActive, gameState])
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return
    
    const gameLoop = () => {
      const now = Date.now()
      const bpmSettings = BPM_SETTINGS[bpm]
      const timePerNote = 1000 / bpmSettings.notesPerSec // milliseconds per note
      
      // Update bird physics
      setBird(prev => {
        let newY = prev.y
        let newVelocity = 0
        
        // Give player 3 seconds grace period at start before gravity applies
        const gracePeriod = 3000 // 3 seconds
        const timeSinceStart = now - gameStartTime.current
        const isInGracePeriod = timeSinceStart < gracePeriod
        
        // If pitch is detected, map frequency to Y position using same function as pipes
        if (isPitchDetectedRef.current && pitch > 0) {
          // Use the same frequency-to-Y mapping as pipes for perfect alignment
          const targetY = frequencyToY(pitch)
          
          // Smooth transition to target Y position
          const transitionSpeed = 0.15 // Adjust for smoother/faster transitions
          newY = prev.y + (targetY - prev.y) * transitionSpeed
          newVelocity = (newY - prev.y) // Calculate velocity based on Y change
        } else if (!isInGracePeriod) {
          // No pitch detected and grace period over, apply gravity
          newVelocity = prev.velocity + GRAVITY
          newY = prev.y + newVelocity
        } else {
          // In grace period, bird stays in place
          newY = prev.y
          newVelocity = 0
        }
        
        // Check boundaries
        if (newY < 0 || newY > height - BIRD_SIZE) {
          setGameState('gameOver')
          return prev
        }
        
        return {
          ...prev,
          y: newY,
          velocity: newVelocity
        }
      })
      
      // Update pipes (movement, generation, and cleanup)
      setPipes(prev => {
        const gameSpeed = GAME_SPEED_BASE * bpmSettings.speed
        const minPipeSpacing = 250 // Minimum pixels between pipes for better spacing
        
        // First, update existing pipe positions
        let updatedPipes = prev
          .map(pipe => ({
            ...pipe,
            x: pipe.x - gameSpeed
          }))
          .filter(pipe => pipe.x + pipe.width > -100) // Remove off-screen pipes
        
        // Then check if we need a new pipe
        const shouldCreatePipe = now - lastNoteTime.current >= timePerNote
        const lastPipe = updatedPipes[updatedPipes.length - 1]
        const hasEnoughSpacing = !lastPipe || (width - lastPipe.x) >= minPipeSpacing
        
        if (shouldCreatePipe && hasEnoughSpacing) {
          const newPipe = createPipe()
          lastNoteTime.current = now
          updatedPipes = [...updatedPipes, newPipe]
        }
        
        return updatedPipes
      })
      
      // Check collisions and scoring
      setPipes(prev => {
        let newScore = score
        let cycleComplete = false
        
        const updatedPipes = prev.map(pipe => {
          // Check if bird passed pipe
          if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            pipe.passed = true
            newScore++
            
            // Check if we completed a full cycle (in easy mode)
            if (difficulty === 'easy' && newScore % noteSequence.length === 0) {
              cycleComplete = true
            }
          }
          
          // Check collision
          if (
            bird.x + BIRD_SIZE > pipe.x &&
            bird.x < pipe.x + pipe.width &&
            (bird.y < pipe.topHeight || bird.y + BIRD_SIZE > pipe.bottomY)
          ) {
            setGameState('gameOver')
          }
          
          return pipe
        })
        
        if (newScore !== score) {
          setScore(newScore)
        }
        
        if (cycleComplete) {
          setCycle(prev => prev + 1)
        }
        
        return updatedPipes
      })
      
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop)
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, bird, score, createPipe, bpm, height, difficulty, noteSequence.length, frequencyToY])
  
  // Start game
  const startGame = useCallback(() => {
    setBird({ x: width * 0.2, y: height / 2, velocity: 0 })
    setPipes([])
    setScore(0)
    setCycle(0)
    setCurrentNoteIndex(0)
    // Reset tolerance based on difficulty
    if (difficulty === 'easy') {
      setCurrentTolerance(DIFFICULTY_SETTINGS[difficulty].initialFrequencyTolerance)
    } else {
      setCurrentTolerance(DIFFICULTY_SETTINGS[difficulty].frequencyTolerance)
    }
    setGameState('playing')
    const now = Date.now()
    lastNoteTime.current = now
    gameStartTime.current = now // Track when game started
  }, [width, height, difficulty])
  
  // Reset game
  const resetGame = useCallback(() => {
    setGameState('menu')
    setBird({ x: width * 0.2, y: height / 2, velocity: 0 })
    setPipes([])
    setScore(0)
    setCycle(0)
    setCurrentNoteIndex(0)
    // Reset tolerance based on difficulty
    if (difficulty === 'easy') {
      setCurrentTolerance(DIFFICULTY_SETTINGS[difficulty].initialFrequencyTolerance)
    } else {
      setCurrentTolerance(DIFFICULTY_SETTINGS[difficulty].frequencyTolerance)
    }
  }, [width, height, difficulty])
  
  // Render game canvas
  const renderGame = useMemo(() => {
    if (gameState === 'menu') return null
    
    return (
      <Canvas style={{ width, height }}>
        <Fill color="#87CEEB" />
        
        {/* Pipes */}
        {pipes.map(pipe => (
          <React.Fragment key={pipe.id}>
            {/* Top pipe */}
            <Rect
              x={pipe.x}
              y={0}
              width={pipe.width}
              height={pipe.topHeight}
              color="#228B22"
            />
            {/* Bottom pipe */}
            <Rect
              x={pipe.x}
              y={pipe.bottomY}
              width={pipe.width}
              height={height - pipe.bottomY}
              color="#228B22"
            />
            {/* Note label background in the gap */}
            <Circle
              cx={pipe.x + pipe.width / 2}
              cy={(pipe.topHeight + pipe.bottomY) / 2}
              r={NOTE_CIRCLE_RADIUS}
              color="rgba(0, 0, 0, 0.9)"
            />
            {/* Note label text in the gap */}
            <SkiaText
              x={pipe.x + pipe.width / 2 + NOTE_TEXT_OFFSET_X}
              y={(pipe.topHeight + pipe.bottomY) / 2 + NOTE_TEXT_OFFSET_Y}
              text={pipe.note.name}
              color="#FFFFFF"
              font={systemFont}
            />
          </React.Fragment>
        ))}
        
        {/* Bird */}
        <Circle
          cx={bird.x + BIRD_SIZE / 2}
          cy={bird.y + BIRD_SIZE / 2}
          r={BIRD_SIZE / 2}
          color="#FFD700"
        />
      </Canvas>
    )
  }, [gameState, width, height, pipes, bird])
  
  // Render menu
  if (gameState === 'menu') {
    return (
      <View style={styles.container}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home' as any)}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.menuContainer}>
          <Text style={styles.title}>Pitch Bird</Text>
          <Text style={styles.subtitle}>Change your voice pitch to move the bird up and down!</Text>
          
          {/* Microphone Status */}
          <View style={[styles.statusContainer, { 
            backgroundColor: isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)' 
          }]}>
            <MaterialCommunityIcons 
              name={isActive ? "microphone" : "microphone-off"} 
              size={20} 
              color={isActive ? "#22c55e" : "#ef4444"} 
            />
            <Text style={[styles.statusText, { 
              color: isActive ? "#22c55e" : "#ef4444" 
            }]}>
              {isActive ? "Microphone Active" : "Microphone Inactive"}
            </Text>
          </View>
          
          {!isActive && (
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionTitle}>How to start:</Text>
              <Text style={styles.instructionText}>1. Go back to Home</Text>
              <Text style={styles.instructionText}>2. Open the Tuner first</Text>
              <Text style={styles.instructionText}>3. Allow microphone access</Text>
              <Text style={styles.instructionText}>4. Return here to play!</Text>
            </View>
          )}
          
          <View style={styles.settingsContainer}>
            <Text style={styles.settingsTitle}>Difficulty</Text>
            <View style={styles.buttonRow}>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.settingButton,
                    difficulty === diff && styles.selectedButton
                  ]}
                  onPress={() => setDifficulty(diff)}
                >
                  <Text style={[
                    styles.buttonText,
                    difficulty === diff && styles.selectedButtonText
                  ]}>
                    {diff.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.settingsTitle}>BPM</Text>
            <View style={styles.buttonRow}>
              {([20, 40, 60, 120] as BPM[]).map(bpmValue => (
                <TouchableOpacity
                  key={bpmValue}
                  style={[
                    styles.settingButton,
                    bpm === bpmValue && styles.selectedButton
                  ]}
                  onPress={() => setBpm(bpmValue)}
                >
                  <Text style={[
                    styles.buttonText,
                    bpm === bpmValue && styles.selectedButtonText
                  ]}>
                    {bpmValue}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity style={styles.playButton} onPress={startGame}>
            <Ionicons name="play" size={32} color="#fff" />
            <Text style={styles.playButtonText}>START</Text>
          </TouchableOpacity>
          
          {!isActive && (
            <View style={styles.warningContainer}>
              <MaterialCommunityIcons name="microphone-off" size={24} color="#ff6b6b" />
              <Text style={styles.warningText}>
                {micAccess !== "granted" ? "Microphone access denied" : "Start tuner first to enable microphone"}
              </Text>
            </View>
          )}
        </View>
      </View>
    )
  }
  
  // Render game over screen
  if (gameState === 'gameOver') {
    return (
      <View style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>Game Over!</Text>
          <Text style={styles.scoreText}>Score: {score}</Text>
          {difficulty === 'easy' && cycle > 0 && (
            <Text style={styles.cycleText}>Cycles Completed: {cycle}</Text>
          )}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={startGame}>
              <Text style={styles.actionButtonText}>PLAY AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={resetGame}>
              <Text style={styles.actionButtonText}>MENU</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }
  
  // Render playing game
  return (
    <View style={styles.container}>
      {renderGame}
      
      {/* Game UI overlay */}
      <View style={styles.gameUI}>
        <View style={styles.scoreContainer}>
          <Text style={styles.gameScore}>Score: {score}</Text>
          {difficulty === 'easy' && (
            <>
              <Text style={styles.cycleInfo}>Cycle: {cycle}</Text>
              <Text style={styles.toleranceInfo}>±{currentTolerance}Hz</Text>
            </>
          )}
        </View>
        
        <View style={styles.noteInfo}>
          <Text style={styles.currentNote}>
            Pitch Control
          </Text>
          {(() => {
            const timeSinceStart = Date.now() - gameStartTime.current
            const gracePeriod = 3000
            const isInGracePeriod = timeSinceStart < gracePeriod
            
            if (isInGracePeriod) {
              const remainingTime = Math.ceil((gracePeriod - timeSinceStart) / 1000)
              return (
                <Text style={[styles.pitchIndicator, { color: '#ffd700' }]}>
                  🛡️ Grace Period: {remainingTime}s
                </Text>
              )
            }
            
            if (pitch > 0) {
              return (
                <>
                  <Text style={styles.yourPitch}>
                    {pitch.toFixed(1)} Hz
                  </Text>
                  <Text style={[styles.pitchIndicator, { 
                    color: isPitchDetectedRef.current ? '#00ff88' : '#fff' 
                  }]}>
                    {isPitchDetectedRef.current ? '🎵 Pitch Control!' : '⬇️ Falling'}
                  </Text>
                </>
              )
            }
            
            return null
          })()}
        </View>
      </View>
      
      <TouchableOpacity style={styles.pauseButton} onPress={resetGame}>
        <Ionicons name="pause" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 40,
  },
  settingsContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  settingButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    minWidth: 60,
  },
  selectedButton: {
    backgroundColor: '#3498db',
  },
  buttonText: {
    color: '#2c3e50',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  selectedButtonText: {
    color: '#fff',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    gap: 10,
  },
  warningText: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 20,
    gap: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  instructionContainer: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 24,
    color: '#2c3e50',
    marginBottom: 10,
  },
  cycleText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    margin: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  gameUI: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
  },
  gameScore: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cycleInfo: {
    color: '#fff',
    fontSize: 14,
  },
  toleranceInfo: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noteInfo: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  currentNote: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentFreq: {
    color: '#fff',
    fontSize: 12,
  },
  yourPitch: {
    color: '#00ff88',
    fontSize: 12,
    marginTop: 5,
  },
  pitchIndicator: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: 'bold',
  },
  pauseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20,
  },
})
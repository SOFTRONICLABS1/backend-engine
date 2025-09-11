// Shared utility functions for games

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max)
}

export const lerp = (start: number, end: number, factor: number): number => {
  return start + (end - start) * factor
}

export const easeOutQuart = (t: number): number => {
  return 1 - Math.pow(1 - t, 4)
}

export const easeInOutQuart = (t: number): number => {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
}

export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

export const normalizeAngle = (angle: number): number => {
  while (angle < 0) angle += 2 * Math.PI
  while (angle > 2 * Math.PI) angle -= 2 * Math.PI
  return angle
}

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Audio utility functions
export const frequencyToNote = (frequency: number): string => {
  const A4 = 440
  const C0 = A4 * Math.pow(2, -4.75)
  
  if (frequency > 0) {
    const h = Math.round(12 * Math.log2(frequency / C0))
    const octave = Math.floor(h / 12)
    const n = h % 12
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    return notes[n] + octave
  }
  
  return ''
}

export const noteToFrequency = (note: string): number => {
  const noteRegex = /^([A-G]#?)(\d)$/
  const match = note.match(noteRegex)
  
  if (!match) return 0
  
  const [, noteName, octaveStr] = match
  const octave = parseInt(octaveStr, 10)
  
  const noteOffsets: Record<string, number> = {
    'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4,
    'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2
  }
  
  const A4 = 440
  const offset = noteOffsets[noteName]
  const semitonesFromA4 = (octave - 4) * 12 + offset
  
  return A4 * Math.pow(2, semitonesFromA4 / 12)
}

export const calculatePitchAccuracy = (detectedFreq: number, targetFreq: number): number => {
  if (!targetFreq || !detectedFreq) return 0
  
  const centsDifference = Math.abs(1200 * Math.log2(detectedFreq / targetFreq))
  const maxCents = 50 // Within 50 cents is considered perfect
  
  if (centsDifference <= maxCents) {
    return Math.max(0, 100 - (centsDifference / maxCents) * 100)
  }
  
  return 0
}

// Game state utilities
export const createGameStateManager = <T extends Record<string, any>>(initialState: T) => {
  type StateKey = keyof T
  type StateValue<K extends StateKey> = T[K]
  
  const state = { ...initialState }
  const listeners: Map<StateKey, Set<(value: any) => void>> = new Map()
  
  const subscribe = <K extends StateKey>(key: K, callback: (value: StateValue<K>) => void) => {
    if (!listeners.has(key)) {
      listeners.set(key, new Set())
    }
    listeners.get(key)!.add(callback)
    
    return () => {
      listeners.get(key)?.delete(callback)
    }
  }
  
  const setState = <K extends StateKey>(key: K, value: StateValue<K>) => {
    state[key] = value
    listeners.get(key)?.forEach(callback => callback(value))
  }
  
  const getState = <K extends StateKey>(key: K): StateValue<K> => state[key]
  
  const resetState = () => {
    Object.keys(initialState).forEach(key => {
      setState(key as StateKey, initialState[key])
    })
  }
  
  return { subscribe, setState, getState, resetState }
}

// Performance utilities
export const createAnimationLoop = (callback: (deltaTime: number) => void) => {
  let lastTime = 0
  let animationId: number | null = null
  let isRunning = false
  
  const loop = (currentTime: number) => {
    if (!isRunning) return
    
    const deltaTime = currentTime - lastTime
    lastTime = currentTime
    
    callback(deltaTime)
    animationId = requestAnimationFrame(loop)
  }
  
  const start = () => {
    if (!isRunning) {
      isRunning = true
      lastTime = performance.now()
      animationId = requestAnimationFrame(loop)
    }
  }
  
  const stop = () => {
    isRunning = false
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }
  
  return { start, stop, isRunning: () => isRunning }
}
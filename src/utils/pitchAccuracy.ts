/**
 * Modular pitch accuracy calculation utility
 * Used by all games for consistent pitch accuracy calculations
 */

export interface PitchAccuracyConfig {
  /** Target frequency in Hz */
  targetFrequency: number;
  /** Sung frequency in Hz */
  sungFrequency: number;
}

export interface CycleAccuracyConfig {
  /** Array of note accuracies within the cycle */
  noteAccuracies: number[];
}

/**
 * Calculate pitch accuracy for a single note
 * 
 * Formula: max(0, (1 – (|sung_freq – target_freq| / target_freq)) × 100)
 * 
 * @param config - Object containing target and sung frequencies
 * @returns Pitch accuracy as a percentage (0-100)
 */
export const calculateNoteAccuracy = ({ targetFrequency, sungFrequency }: PitchAccuracyConfig): number => {
  if (targetFrequency <= 0) {
    throw new Error('Target frequency must be greater than 0');
  }
  
  if (sungFrequency < 0) {
    throw new Error('Sung frequency cannot be negative');
  }
  
  // Calculate the relative error
  const relativeError = Math.abs(sungFrequency - targetFrequency) / targetFrequency;
  
  // Calculate accuracy using the formula: max(0, (1 - relative_error) × 100)
  const accuracy = Math.max(0, (1 - relativeError) * 100);
  
  return accuracy;
};

/**
 * Calculate overall accuracy for a cycle using pitch accuracy per cycle formula
 * 
 * Formula: (sum of all note accuracies in the cycle) / (number of notes in the cycle)
 * 
 * @param config - Object containing array of note accuracies
 * @returns Cycle accuracy as a percentage (0-100), or null if no notes provided
 */
export const calculateCycleAccuracy = ({ noteAccuracies }: CycleAccuracyConfig): number | null => {
  if (!noteAccuracies || noteAccuracies.length === 0) {
    return null;
  }
  
  // Validate that all accuracies are valid numbers between 0 and 100
  const validAccuracies = noteAccuracies.filter(accuracy => 
    typeof accuracy === 'number' && 
    !isNaN(accuracy) && 
    accuracy >= 0 && 
    accuracy <= 100
  );
  
  if (validAccuracies.length === 0) {
    return null;
  }
  
  // Calculate cycle accuracy: sum of all note accuracies / number of notes
  const totalAccuracy = validAccuracies.reduce((sum, accuracy) => sum + accuracy, 0);
  const cycleAccuracy = totalAccuracy / validAccuracies.length;
  
  return cycleAccuracy;
};

/**
 * Calculate overall accuracy across multiple cycles
 * 
 * @param allNoteAccuracies - Array of all note accuracies from all cycles
 * @returns Overall accuracy as a percentage (0-100), or null if no notes provided
 */
export const calculateOverallAccuracy = (allNoteAccuracies: number[]): number | null => {
  return calculateCycleAccuracy({ noteAccuracies: allNoteAccuracies });
};

/**
 * Utility type for frequency conversion
 */
export interface FrequencyNote {
  note: string;
  octave: number;
  frequency: number;
}

/**
 * Convert a note name and octave to frequency
 * Using A4 = 440Hz as reference
 * 
 * @param note - Note name (A, B, C, etc.)
 * @param octave - Octave number
 * @returns Frequency in Hz
 */
export const noteToFrequency = (note: string, octave: number): number => {
  const noteMap: { [key: string]: number } = {
    'C': -9,
    'C#': -8,
    'Db': -8,
    'D': -7,
    'D#': -6,
    'Eb': -6,
    'E': -5,
    'F': -4,
    'F#': -3,
    'Gb': -3,
    'G': -2,
    'G#': -1,
    'Ab': -1,
    'A': 0,
    'A#': 1,
    'Bb': 1,
    'B': 2
  };
  
  const normalizedNote = note.charAt(0).toUpperCase() + note.slice(1);
  const semitonesFromA4 = noteMap[normalizedNote];
  
  if (semitonesFromA4 === undefined) {
    throw new Error(`Invalid note: ${note}`);
  }
  
  // Calculate semitones from A4 (440Hz)
  const totalSemitones = semitonesFromA4 + (octave - 4) * 12;
  
  // Convert to frequency using equal temperament: f = 440 * 2^(n/12)
  const frequency = 440 * Math.pow(2, totalSemitones / 12);
  
  return frequency;
};
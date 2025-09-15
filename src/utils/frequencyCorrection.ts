import { Platform } from 'react-native';
import { NOTE_FREQUENCIES } from './noteParser';

// Get the closest note to a frequency with improved range handling
export const getClosestNote = (frequency: number): string => {
  let closestNote = 'C4';
  let minDifference = Number.MAX_VALUE;

  // Filter to reasonable vocal range for performance (C2-C7)
  const vocalRangeNotes = Object.entries(NOTE_FREQUENCIES).filter(([, freq]) =>
    freq >= 65.41 && freq <= 2093.00  // C2 to C7
  );

  for (const [note, freq] of vocalRangeNotes) {
    const difference = Math.abs(frequency - freq);
    if (difference < minDifference) {
      minDifference = difference;
      closestNote = note;
    }
  }

  return closestNote;
};

// Enhanced octave detection and correction for Android - specifically targeting C4 (261.63 Hz) issues
export const correctFrequencyOctave = (detectedFreq: number, expectedRange?: [number, number], previousFreq?: number): number => {
  if (!detectedFreq || detectedFreq <= 0) return detectedFreq;

  let correctedFreq = detectedFreq;
  let bestCorrection = detectedFreq;
  let bestError = Number.MAX_VALUE;
  let bestScoreRatio = 0;

  // Test all possible octave corrections with more comprehensive approach
  const testFrequencies = [
    detectedFreq,         // Original
    detectedFreq * 2,     // Octave up
    detectedFreq * 4,     // Two octaves up
    detectedFreq * 8,     // Three octaves up (for very low detected frequencies)
    detectedFreq / 2,     // Octave down
    detectedFreq / 4,     // Two octaves down
    detectedFreq / 8,     // Three octaves down (for very high detected frequencies)
    detectedFreq * 3,     // Perfect fifth + octave
    detectedFreq / 3,     // Perfect fifth down
    detectedFreq * 1.5,   // Perfect fifth up
    detectedFreq / 1.5,   // Perfect fifth down
  ];

  // Find the frequency that best matches a musical note with enhanced scoring
  for (const testFreq of testFrequencies) {
    if (testFreq < 60 || testFreq > 1400) continue; // Extended range to catch more cases

    const closestNote = getClosestNote(testFreq);
    const expectedFreq = NOTE_FREQUENCIES[closestNote];
    const error = Math.abs(testFreq - expectedFreq);
    const errorPercent = error / expectedFreq;

    // Special handling for C4 (261.63 Hz) - common problematic note
    let scoreBonus = 0;
    if (closestNote === 'C4' && Math.abs(testFreq - 261.63) < 15) {
      scoreBonus = 0.3; // Give C4 a significant advantage if it's close
    }

    // Enhanced scoring system that considers both accuracy and musical sense
    let score = 0;
    if (errorPercent < 0.02) {
      score = 1.0 + scoreBonus; // Very accurate
    } else if (errorPercent < 0.05) {
      score = 0.8 + scoreBonus; // Good accuracy
    } else if (errorPercent < 0.08) {
      score = 0.6 + scoreBonus; // Acceptable accuracy
    } else if (errorPercent < 0.12) {
      score = 0.3 + scoreBonus; // Poor but possible
    }

    // Prefer frequencies within vocal range (enhanced for typical singing)
    if (testFreq >= 80 && testFreq <= 800) {
      score += 0.2; // Vocal range bonus
    }

    // If we have previous frequency context, prefer closer matches
    if (previousFreq && previousFreq > 0) {
      const jumpRatio = Math.abs(testFreq - previousFreq) / previousFreq;
      if (jumpRatio < 0.1) score += 0.15; // Very stable
      else if (jumpRatio < 0.2) score += 0.1; // Stable
      else if (jumpRatio > 0.5) score -= 0.2; // Penalize big jumps
    }

    // Update best choice based on score
    if (score > bestScoreRatio && error < bestError * 2) {
      bestError = error;
      bestCorrection = testFreq;
      bestScoreRatio = score;
    }
  }

  correctedFreq = bestCorrection;

  // Additional check: if we have a previous frequency, avoid big jumps
  if (previousFreq && previousFreq > 0) {
    const ratio = correctedFreq / previousFreq;

    // If correction creates a big jump, try other options
    if (ratio > 2.2 || ratio < 0.45) {
      // Try to find a correction closer to the previous frequency
      let closestToPrevious = correctedFreq;
      let smallestJump = Math.abs(correctedFreq - previousFreq);

      for (const testFreq of testFrequencies) {
        if (testFreq < 70 || testFreq > 1300) continue;

        const jump = Math.abs(testFreq - previousFreq);
        const closestNote = getClosestNote(testFreq);
        const expectedFreq = NOTE_FREQUENCIES[closestNote];
        const errorPercent = Math.abs(testFreq - expectedFreq) / expectedFreq;

        // Accept if it's a reasonable musical note and smaller jump
        if (errorPercent < 0.08 && jump < smallestJump) {
          smallestJump = jump;
          closestToPrevious = testFreq;
        }
      }

      correctedFreq = closestToPrevious;
    }
  }

  // Apply expected range correction if provided
  if (expectedRange) {
    const [minExpected, maxExpected] = expectedRange;

    if (correctedFreq < minExpected || correctedFreq > maxExpected) {
      // Try to bring frequency into expected range
      const octaveOptions = [correctedFreq, correctedFreq * 2, correctedFreq / 2];

      for (const option of octaveOptions) {
        if (option >= minExpected && option <= maxExpected) {
          correctedFreq = option;
          break;
        }
      }
    }
  }

  // Final validation: ensure frequency is in reasonable range
  if (correctedFreq < 80 || correctedFreq > 1200) {
    return detectedFreq; // Return original if correction makes it worse
  }

  return correctedFreq;
};

// Enhanced smooth frequency transitions with octave jump detection
export const smoothFrequencyTransition = (
  currentFreq: number,
  newFreq: number,
  smoothingFactor: number = Platform.OS === 'android' ? 0.2 : 0.6
): number => {
  if (currentFreq <= 0) return newFreq;

  // Apply octave correction to new frequency before smoothing
  const correctedNewFreq = correctFrequencyOctave(newFreq, undefined, currentFreq);

  // Detect large jumps that might still be octave errors
  const ratio = correctedNewFreq / currentFreq;

  // If still a large jump after correction, apply more aggressive smoothing
  if (ratio > 1.5 || ratio < 0.67) {
    const aggressiveSmoothingFactor = Platform.OS === 'android' ? 0.1 : 0.3;
    return aggressiveSmoothingFactor * correctedNewFreq + (1 - aggressiveSmoothingFactor) * currentFreq;
  }

  // Normal smoothing with corrected frequency
  return smoothingFactor * correctedNewFreq + (1 - smoothingFactor) * currentFreq;
};

// Android-specific frequency validation
export const validateAndroidFrequency = (frequency: number, rms: number): boolean => {
  if (Platform.OS !== 'android') return true;

  // More lenient validation for Android due to processing differences
  if (frequency < 70 || frequency > 1300) return false;
  if (rms < 0.005) return false; // Require minimum signal strength

  return true;
};

// Get note name from frequency with enhanced octave correction specifically for C4 issues
export const getNoteFromFrequency = (frequency: number, previousFreq?: number): { note: string, cents: number, octave: number } => {
  // Apply enhanced octave correction
  const correctedFreq = correctFrequencyOctave(frequency, undefined, previousFreq);
  const closestNote = getClosestNote(correctedFreq);
  const expectedFreq = NOTE_FREQUENCIES[closestNote];

  // Special validation for C4 - if input frequency is very close to C4, prefer C4
  let finalNote = closestNote;
  let finalFreq = correctedFreq;

  if (Math.abs(frequency - 261.63) < 20 || Math.abs(correctedFreq - 261.63) < 20) {
    // Check if C4 is actually the best match
    const c4Error = Math.abs(correctedFreq - 261.63);
    const currentError = Math.abs(correctedFreq - expectedFreq);

    if (c4Error <= currentError * 1.2) { // Allow slight preference for C4
      finalNote = 'C4';
      finalFreq = correctedFreq; // Keep corrected frequency for cents calculation
    }
  }

  const finalExpectedFreq = NOTE_FREQUENCIES[finalNote];

  // Calculate cents difference (100 cents = 1 semitone)
  const cents = Math.round(1200 * Math.log2(finalFreq / finalExpectedFreq));

  // Extract octave from note name (handles both single and double digit octaves)
  const octaveMatch = finalNote.match(/(\d+)$/);
  const octave = octaveMatch ? parseInt(octaveMatch[1]) : 4;
  const noteName = finalNote.replace(/\d+$/, '');

  return {
    note: noteName,
    cents,
    octave
  };
};
import { NOTE_FREQUENCIES } from './noteParser';
import { Audio } from 'expo-av';
import { encode as btoa } from 'base-64';

// WAV tone generator for harmonics
function generateHarmonicWavDataUri(frequency: number, durationMs: number, sampleRate = 44100, volume = 0.3) {
  const durationSeconds = Math.max(0.03, durationMs / 1000);
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;
  function writeString(s: string) { for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i)); }

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bytesPerSample * 8, true); offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true); offset += 4;

  // Generate TuneTracker-style harmonic tones
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Match TuneTracker's exact harmonic structure
    const s1 = Math.sin(2 * Math.PI * frequency * t);
    const s2 = 0.35 * Math.sin(2 * Math.PI * frequency * 2 * t);
    const s3 = 0.12 * Math.sin(2 * Math.PI * frequency * 3 * t);

    let sample = (s1 + s2 + s3) * (volume * 0.9);
    
    // Apply TuneTracker-style envelope (simple attack/release)
    const attack = Math.min(0.02, durationSeconds * 0.2);
    const release = Math.min(0.03, durationSeconds * 0.25);
    let amp = 1.0;

    if (t < attack) {
      amp = t / attack;
    } else if (t > durationSeconds - release) {
      amp = Math.max(0, (durationSeconds - t) / release);
    }

    sample *= amp;
    
    const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
    view.setInt16(offset, Math.floor(intSample), true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.prototype.slice.call(chunk));
  }
  const base64 = btoa(binary);
  return `data:audio/wav;base64,${base64}`;
}

export class GuitarHarmonics {
  private activeSounds: Audio.Sound[] = [];

  constructor() {
    console.log('🎵 TuneTrackerHarmonics: Initialized with expo-av backend');
  }

  private async playDataUriWithExpo(dataUri: string): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: dataUri }, { shouldPlay: true });
      
      // Track the sound for cleanup
      this.activeSounds.push(sound);
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status || status.isLoaded === false) return;
        if (status.didJustFinish) {
          try { 
            sound.unloadAsync();
            // Remove from active sounds
            const index = this.activeSounds.indexOf(sound);
            if (index > -1) {
              this.activeSounds.splice(index, 1);
            }
          } catch {}
        }
      });
    } catch (e) {
      console.warn('🎵 TuneTrackerHarmonics: expo-av playback error', e);
    }
  }

  playNote(note: string, duration: number): void {
    console.log(`🎵 TuneTrackerHarmonics: Playing note ${note} (${duration}ms)`);
    const frequency = NOTE_FREQUENCIES[note];
    if (!frequency) {
      console.warn(`🎵 TuneTrackerHarmonics: Note ${note} not found in frequencies`);
      return;
    }
    console.log(`🎵 TuneTrackerHarmonics: Note ${note} -> ${frequency}Hz`);
    
    try {
      const dataUri = generateHarmonicWavDataUri(frequency, duration);
      this.playDataUriWithExpo(dataUri);
    } catch (error) {
      console.warn('🎵 TuneTrackerHarmonics: Error generating harmonic tone:', error);
    }
  }

  stopAll(): void {
    console.log('🎵 TuneTrackerHarmonics: Stopping all sounds');
    this.activeSounds.forEach(sound => {
      try {
        sound.stopAsync();
        sound.unloadAsync();
      } catch (error) {
        console.warn('🎵 TuneTrackerHarmonics: Error stopping sound:', error);
      }
    });
    this.activeSounds = [];
  }
}
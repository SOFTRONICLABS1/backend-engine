import { getFreqFromNote, getNoteFromFreq, Note } from "./notes"
import { InstrumentType, TuningType } from "./stores/configStore"

export type InstrumentString = { note: Note; freq: number }

export abstract class Instrument {
  tuning: TuningType
  abstract readonly name: InstrumentType
  abstract readonly hasStrings: boolean

  constructor(tuning: TuningType) {
    this.tuning = tuning
  }

  abstract getStrings(): Note[]

  abstract getNearestString(freq: number): InstrumentString | undefined

  getNearestIdx(frequency: number, freqs: number[]): number | undefined {
    // TODO: Evaluate if measure in semitones instead of linear frequency ?
    let minDistance = Infinity
    let minIdx = 0
    for (let i = 0; i < freqs.length; i++) {
      const d = Math.abs(frequency - freqs[i])
      if (d < minDistance) {
        minDistance = d
        minIdx = i
      }
    }
    return minIdx
  }
}

export class Guitar extends Instrument {
  stringNotes: Note[] = [
    { name: "E", octave: 2 },
    { name: "A", octave: 2 },
    { name: "D", octave: 3 },
    { name: "G", octave: 3 },
    { name: "B", octave: 3 },
    { name: "E", octave: 4 },
  ]
  stringFreqs: number[] // depends on tuning type

  constructor(tuning: TuningType) {
    super(tuning)
    this.stringFreqs = this.stringNotes.map((note) => getFreqFromNote(note, tuning))
  }

  get name(): InstrumentType {
    return "guitar"
  }

  get hasStrings() {
    return true
  }

  getStrings(): Note[] {
    return this.stringNotes
  }

  getNearestString(freq: number): InstrumentString | undefined {
    const idx = this.getNearestIdx(freq, this.stringFreqs)
    if (idx === undefined) return undefined
    const note = this.stringNotes[idx]
    return { note, freq: this.stringFreqs[idx] }
  }
}

export class Chromatic extends Instrument {
  get name(): InstrumentType {
    return "chromatic"
  }

  get hasStrings() {
    return false
  }

  getStrings(): Note[] {
    return []
  }

  getNearestString(freq: number): InstrumentString | undefined {
    // Find nearest note
    const note = getNoteFromFreq(freq, this.tuning)
    if (!note) return undefined

    // Find frequency of the nearest note
    const noteFreq = getFreqFromNote(note, this.tuning)
    return { note, freq: noteFreq }
  }
}

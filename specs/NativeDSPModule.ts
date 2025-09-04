import { NativeModules } from "react-native"

export interface Spec {
  pitch: (
    input: number[],
    sampleRate: number,
    minFreq: number,
    maxFreq: number,
    threshold: number
  ) => Promise<number>
  rms: (input: number[]) => Promise<number>
}

export default NativeModules.NativeDSPModule as Spec

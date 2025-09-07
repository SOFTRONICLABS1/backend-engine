import AVFoundation
import ExpoModulesCore

let BUF_PER_SEC = 15

public class MicrophoneStreamModule: Module {

  private let audioSession = AVAudioSession.sharedInstance()
  private let audioEngine = AVAudioEngine()
  private var audioBufferHandler: (([Float]) -> Void)?
  private var dummyTimer: Timer?

  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  public func definition() -> ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('MicrophoneStream')` in JavaScript.
    Name("MicrophoneStream")

    // Defines event names that the module can send to JavaScript.
    Events("onAudioBuffer")

    Constants([
      "BUF_PER_SEC": BUF_PER_SEC
    ])

    AsyncFunction("requestPermission") { (promise: Promise) in
      self.audioSession.requestRecordPermission { granted in
        if granted {
          promise.resolve("granted")
        } else {
          promise.resolve("denied")
        }
      }
    }

    Function("startRecording") {
      // audioBufferHandler = handler
      // Note: Permission should be requested via requestPermission() first
      
      print("Configuring audioSession")
      DispatchQueue.main.async {
          do {
              try self.audioSession.setCategory(.record, mode: .measurement, options: [.allowBluetooth])
              try self.audioSession.setActive(true)
              
              // Ensure audio engine is not already running
              if self.audioEngine.isRunning {
                  self.audioEngine.stop()
                  self.audioEngine.inputNode.removeTap(onBus: 0)
              }

              let inputNode = self.audioEngine.inputNode
              let hwFormat = inputNode.inputFormat(forBus: 0)
              
              print("Hardware format: sampleRate=\(hwFormat.sampleRate), channels=\(hwFormat.channelCount)")
              
              // Check if hardware format is valid (simulator often has invalid format)
              if hwFormat.sampleRate <= 0 || hwFormat.channelCount <= 0 {
                  print("Invalid hardware format detected - likely running in simulator. Using dummy data with simulated pitch.")
                  // For simulators, send dummy data with simulated pitch variations
                  var dummyFrequency: Float = 220.0 // A3 note
                  let sampleRate: Float = 44100.0
                  var phase: Float = 0.0
                  
                  self.dummyTimer = Timer.scheduledTimer(withTimeInterval: 1.0/Double(BUF_PER_SEC), repeats: true) { _ in
                      // Generate a simple sine wave at the dummy frequency
                      let bufferSize = 512
                      var dummySamples = [Float](repeating: 0.0, count: bufferSize)
                      let phaseIncrement = 2.0 * Float.pi * dummyFrequency / sampleRate
                      
                      for i in 0..<bufferSize {
                          dummySamples[i] = sin(phase) * 0.1 // Low amplitude sine wave
                          phase += phaseIncrement
                          if phase >= 2.0 * Float.pi {
                              phase -= 2.0 * Float.pi
                          }
                      }
                      
                      // Vary the frequency slightly to simulate pitch changes
                      dummyFrequency += Float.random(in: -5.0...5.0)
                      dummyFrequency = max(100.0, min(400.0, dummyFrequency)) // Keep in reasonable range
                      
                      self.sendEvent("onAudioBuffer", [
                          "samples": dummySamples
                      ])
                  }
                  return
              }
              
              // Try to use the hardware format, but with error handling
              let bufferSize = AVAudioFrameCount(self.audioSession.sampleRate / Double(BUF_PER_SEC))
              print("Using hardware format: sampleRate=\(hwFormat.sampleRate), channels=\(hwFormat.channelCount)")

              do {
                  inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: hwFormat) { buffer, _ in
                      guard let channelData = buffer.floatChannelData else { return }
                      let frameLength = Int(buffer.frameLength)
                      let samples = Array(UnsafeBufferPointer(start: channelData[0], count: frameLength))
                      self.sendEvent("onAudioBuffer", [
                        "samples": samples
                      ])
                  }
                  try self.audioEngine.start()
              } catch {
                  print("Failed to install tap or start engine, falling back to dummy data with simulated pitch: \(error)")
                  // Fallback to dummy data with simulated pitch if audio engine fails
                  var dummyFrequency: Float = 220.0 // A3 note
                  let sampleRate: Float = 44100.0
                  var phase: Float = 0.0
                  
                  self.dummyTimer = Timer.scheduledTimer(withTimeInterval: 1.0/Double(BUF_PER_SEC), repeats: true) { _ in
                      // Generate a simple sine wave at the dummy frequency
                      let bufferSize = 512
                      var dummySamples = [Float](repeating: 0.0, count: bufferSize)
                      let phaseIncrement = 2.0 * Float.pi * dummyFrequency / sampleRate
                      
                      for i in 0..<bufferSize {
                          dummySamples[i] = sin(phase) * 0.1 // Low amplitude sine wave
                          phase += phaseIncrement
                          if phase >= 2.0 * Float.pi {
                              phase -= 2.0 * Float.pi
                          }
                      }
                      
                      // Vary the frequency slightly to simulate pitch changes
                      dummyFrequency += Float.random(in: -5.0...5.0)
                      dummyFrequency = max(100.0, min(400.0, dummyFrequency)) // Keep in reasonable range
                      
                      self.sendEvent("onAudioBuffer", [
                          "samples": dummySamples
                      ])
                  }
              }
          } catch {
              print("Error configuring audio session: \(error.localizedDescription)")
          }
      }
    }

    Function("stopRecording") {
      self.stopRecording()
    }

    Function("getSampleRate") { () -> Double in
      // Requires initializing inputNode before retrieving sampleRate
      return self.audioEngine.inputNode.inputFormat(forBus: 0).sampleRate
    }
  }

  private func stopRecording() {
    // Stop timer if it exists
    dummyTimer?.invalidate()
    dummyTimer = nil
    
    // Stop audio engine if it's running
    if audioEngine.isRunning {
        audioEngine.inputNode.removeTap(onBus: 0)
        audioEngine.stop()
    }
    
    try? AVAudioSession.sharedInstance().setActive(false)
    audioBufferHandler = nil
  }
}

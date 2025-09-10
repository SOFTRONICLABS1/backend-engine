import Foundation
import AVFoundation
import React

@objc(AudioRouteManager)
class AudioRouteManager: RCTEventEmitter {
    
    private var hasListeners = false
    private let audioSession = AVAudioSession.sharedInstance()
    
    override init() {
        super.init()
        setupAudioSession()
        addAudioRouteObserver()
    }
    
    deinit {
        removeAudioRouteObserver()
    }
    
    // MARK: - RCTEventEmitter Override
    
    override func supportedEvents() -> [String]! {
        return ["audioRouteChanged"]
    }
    
    override func startObserving() {
        hasListeners = true
    }
    
    override func stopObserving() {
        hasListeners = false
    }
    
    // MARK: - Audio Session Setup
    
    private func setupAudioSession() {
        do {
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [.allowBluetooth, .allowBluetoothA2DP])
            try audioSession.setActive(true)
        } catch {
            print("🎧 Failed to setup audio session: \\(error)")
        }
    }
    
    // MARK: - Audio Route Observer
    
    private func addAudioRouteObserver() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(audioRouteChanged),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }
    
    private func removeAudioRouteObserver() {
        NotificationCenter.default.removeObserver(
            self,
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }
    
    @objc private func audioRouteChanged(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }
        
        print("🎧 Audio route changed, reason: \\(reason.rawValue)")
        
        let currentRoute = audioSession.currentRoute
        let routeInfo = createRouteInfo(from: currentRoute)
        
        if hasListeners {
            sendEvent(withName: "audioRouteChanged", body: routeInfo)
        }
    }
    
    // MARK: - React Native Methods
    
    @objc
    func getCurrentAudioRoute(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let currentRoute = audioSession.currentRoute
        let routeInfo = createRouteInfo(from: currentRoute)
        resolve(routeInfo)
    }
    
    // MARK: - Helper Methods
    
    private func createRouteInfo(from route: AVAudioSessionRouteDescription) -> [String: Any] {
        var outputs: [[String: Any]] = []
        var inputs: [[String: Any]] = []
        
        var hasHeadphones = false
        var deviceType = "unknown"
        
        // Process outputs
        for output in route.outputs {
            let outputInfo: [String: Any] = [
                "portName": output.portName,
                "portType": output.portType.rawValue,
                "uid": output.uid
            ]
            outputs.append(outputInfo)
            
            // Check if this is a headphone output
            if isHeadphonePort(output.portType) {
                hasHeadphones = true
                if deviceType == "unknown" {
                    deviceType = getDeviceType(from: output.portType)
                }
            }
        }
        
        // Process inputs
        for input in route.inputs {
            let inputInfo: [String: Any] = [
                "portName": input.portName,
                "portType": input.portType.rawValue,
                "uid": input.uid
            ]
            inputs.append(inputInfo)
        }
        
        return [
            "outputs": outputs,
            "inputs": inputs,
            "hasHeadphones": hasHeadphones,
            "deviceType": deviceType
        ]
    }
    
    private func isHeadphonePort(_ portType: AVAudioSession.Port) -> Bool {
        switch portType {
        case .headphones,
             .bluetoothA2DP,
             .bluetoothHFP,
             .bluetoothLE:
            return true
        default:
            return false
        }
    }
    
    private func getDeviceType(from portType: AVAudioSession.Port) -> String {
        switch portType {
        case .headphones:
            return "wired"
        case .bluetoothA2DP,
             .bluetoothHFP,
             .bluetoothLE:
            return "bluetooth"
        default:
            return "unknown"
        }
    }
    
    // MARK: - React Native Bridge
    
    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}
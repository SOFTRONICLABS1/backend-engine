import * as SplashScreen from "expo-splash-screen"
import * as React from "react"
import { useEffect } from "react"
import { Navigation } from "./navigation"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { initializeGlobalMicrophone } from "./hooks/useGlobalMicrophoneManager"

SplashScreen.preventAutoHideAsync()

export function App() {
  // Initialize global microphone system when app starts
  useEffect(() => {
    const initializeMicrophone = async () => {
      try {
        await initializeGlobalMicrophone()
        console.log("Global microphone system initialized")
      } catch (error) {
        console.error("Failed to initialize global microphone system:", error)
      }
    }

    initializeMicrophone()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Navigation
        linking={{
          enabled: "auto",
          prefixes: [
            // Change the scheme to match your app's scheme defined in app.json
            "tuneo://",
          ],
        }}
        onReady={() => {
          SplashScreen.hideAsync()
        }}
      />
    </GestureHandlerRootView>
  )
}

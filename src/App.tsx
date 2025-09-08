import * as SplashScreen from "expo-splash-screen"
import * as React from "react"
import { useEffect } from "react"
import { Navigation } from "./navigation"
import { MusicAppNavigation } from "./navigation/MusicAppNavigation"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { initializeGlobalMicrophone } from "./hooks/useGlobalMicrophoneManager"
import { ThemeProvider } from "./theme/ThemeContext"
import { AuthProvider } from "./context/AuthContext"

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

  // You can switch between the original backend-engine navigation and the new music app navigation
  // Set USE_MUSIC_APP to true to enable the full music app experience with authentication
  // Set to false to use the original backend-engine interface
  const USE_MUSIC_APP = true;

  if (USE_MUSIC_APP) {
    // Use the enhanced music app navigation with authentication and full feature set
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MusicAppNavigation onReady={() => SplashScreen.hideAsync()} />
      </GestureHandlerRootView>
    )
  } else {
    // Use the original backend-engine navigation (preserves existing functionality)
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthProvider>
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
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    )
  }
}
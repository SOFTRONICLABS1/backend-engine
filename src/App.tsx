import * as React from "react"
import { Navigation } from "./navigation"
import { MusicAppNavigation } from "./navigation/MusicAppNavigation"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { ThemeProvider } from "./theme/ThemeContext"
import { AuthProvider } from "./context/AuthContext"

export function App() {
  // Microphone is now only initialized when accessing games-related screens

  // You can switch between the original backend-engine navigation and the new music app navigation
  // Set USE_MUSIC_APP to true to enable the full music app experience with authentication
  // Set to false to use the original backend-engine interface
  const USE_MUSIC_APP = true;

  if (USE_MUSIC_APP) {
    // Use the enhanced music app navigation with authentication and full feature set
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MusicAppNavigation />
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
                console.log('Navigation ready')
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    )
  }
}
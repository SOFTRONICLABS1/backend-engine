import { createStaticNavigation } from "@react-navigation/native"
import type { StaticParamList } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Home } from "./screens/Home"
import { Settings } from "./screens/Settings"
import { Tuneo } from "./screens/Tuneo"
import { FlappyBird } from "./screens/FlappyBird"
import Colors from "@/Colors"
import { CloseButton } from "@/components/CloseButton"
import { Platform } from "react-native"

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: Home,
      options: {
        headerShown: false,
      },
    },
    Tuneo: {
      screen: Tuneo,
      options: {
        headerShown: false,
      },
    },
    FlappyBird: {
      screen: FlappyBird,
      options: {
        headerShown: false,
      },
    },
    Settings: {
      screen: Settings,
      options: () => ({
        headerTitleStyle: { color: Colors.primary },
        headerStyle: { backgroundColor: Colors.bgTitle },
        headerTintColor: Colors.primary,
        headerShadowVisible: false,
        ...(Platform.OS === "ios"
          ? { presentation: "fullScreenModal", headerRight: () => <CloseButton /> }
          : {}),
      }),
    },
  },
})

export const Navigation = createStaticNavigation(RootStack)

type RootStackParamList = StaticParamList<typeof RootStack>

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}

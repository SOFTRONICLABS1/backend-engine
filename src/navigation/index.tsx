import { createStaticNavigation } from "@react-navigation/native"
import type { StaticParamList } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Home } from "./screens/Home"
import { Settings } from "./screens/Settings"
import { Tuneo } from "./screens/Tuneo"
// import { FlappyBird } from "./screens/FlappyBird"
import { TestGameLauncher } from "../test/TestGameLauncher"
import AuthScreen from "./screens/AuthScreen"
import WelcomeUserScreen from "./screens/WelcomeUserScreen"
import UsernamePickerScreen from "./screens/UsernamePickerScreen" 
import UserProfileScreen from "./screens/UserProfileScreen"
import TabNavigator from "./TabNavigator"
import MusicHomeScreen from "./screens/MusicHomeScreen"
import ExploreScreen from "./screens/ExploreScreen"
import ProfileScreen from "./screens/ProfileScreen"
import GamesScreen from "./screens/GamesScreen"
import EditProfileScreen from "./screens/EditProfileScreen"
import FollowersScreen from "./screens/FollowersScreen"
import FollowingScreen from "./screens/FollowingScreen"
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
    // FlappyBird: {
    //   screen: FlappyBird,
    //   options: {
    //     headerShown: false,
    //   },
    // },
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
    TestSDK: {
      screen: TestGameLauncher,
      options: {
        headerShown: false,
      },
    },
    MusicAuth: {
      screen: AuthScreen,
      options: {
        headerShown: false,
      },
    },
    WelcomeUser: {
      screen: WelcomeUserScreen,
      options: {
        headerShown: false,
      },
    },
    UsernamePicker: {
      screen: UsernamePickerScreen,
      options: {
        headerShown: false,
      },
    },
    UserProfile: {
      screen: UserProfileScreen,
      options: {
        headerShown: false,
      },
    },
    Tabs: {
      screen: TabNavigator,
      options: {
        headerShown: false,
      },
    },
    MusicHome: {
      screen: MusicHomeScreen,
      options: {
        headerShown: false,
      },
    },
    Explore: {
      screen: ExploreScreen,
      options: {
        headerShown: false,
      },
    },
    Profile: {
      screen: ProfileScreen,
      options: {
        headerShown: false,
      },
    },
    Games: {
      screen: GamesScreen,
      options: {
        headerShown: false,
      },
    },
    EditProfile: {
      screen: EditProfileScreen,
      options: {
        headerShown: false,
      },
    },
    Followers: {
      screen: FollowersScreen,
      options: {
        headerShown: false,
      },
    },
    Following: {
      screen: FollowingScreen,
      options: {
        headerShown: false,
      },
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

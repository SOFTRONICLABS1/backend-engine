import Colors from "@/Colors"
import { FormPicker } from "@/components/FormPicker"
import { useSettingsOptions, useTranslation } from "@/configHooks"
import { GraphicsMode, LanguageType, ThemeType, useConfigStore } from "@/stores/configStore"
import { useNavigation } from "@react-navigation/native"
import { useEffect, useMemo } from "react"
import { StyleSheet, View } from "react-native"

export function Settings() {
  const config = useConfigStore()
  const options = useSettingsOptions()
  const languages = useMemo(() => options.getLanguages(), [options])
  const themes = useMemo(() => options.getThemes(), [options])
  const graphics = useMemo(() => options.getGraphics(), [options])
  const navigation = useNavigation()
  const t = useTranslation()

  useEffect(() => {
    navigation.setOptions({ title: t("settings") })
  }, [navigation, t])

  return (
    <View style={styles.container}>
      <FormPicker
        label={t("language")}
        actions={languages}
        value={config.language}
        onSelect={(lang) => config.setLanguage(lang as LanguageType)}
      />
      <FormPicker
        label={t("theme")}
        actions={themes}
        value={config.theme}
        onSelect={(theme) => config.setTheme(theme as ThemeType)}
      />
      <FormPicker
        label={t("graphics")}
        actions={graphics}
        value={config.graphics}
        onSelect={(graphics) => config.setGraphics(graphics as GraphicsMode)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgInactive,
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    gap: 20,
    padding: 20,
  },
})

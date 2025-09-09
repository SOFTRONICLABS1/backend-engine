import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from './Colors';

export type ThemeType = 'light' | 'dark';

interface Theme {
  background: string;
  surface: string;
  surfacePlus: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  cardBorder: string;
  input: string;
  inputBorder: string;
  inputFocus: string;
  badge: string;
  badgeText: string;
  modal: string;
  overlay: string;
}

interface ThemeContextType {
  theme: Theme;
  themeType: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>(systemColorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    setThemeType(systemColorScheme === 'dark' ? 'dark' : 'light');
  }, [systemColorScheme]);

  const theme = themeType === 'light' ? Colors.light : Colors.dark;
  const isDark = themeType === 'dark';

  const toggleTheme = () => {
    setThemeType(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, themeType, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
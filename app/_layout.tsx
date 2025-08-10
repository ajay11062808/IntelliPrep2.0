import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from 'expo-status-bar';
import { useEffect } from "react";
import 'react-native-reanimated';
import { AuthProvider } from "../constants/AuthContext";
import { ThemePreferenceProvider, useThemePreference } from "../constants/themeContext";
import '../globals.css';
// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync()

function RootTree() {
  console.log("App layout loaded")
  const colorScheme = useColorScheme();
  const { themeMode } = useThemePreference()
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  })

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  const resolved = themeMode === 'system' ? colorScheme : themeMode
  return (
    <ThemeProvider value={resolved === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Catch-all for links like /auth/confirm from templates */}
        <Stack.Screen name="auth/confirm" options={{ headerShown: false }} />
        {/* Password reset deep link destination */}
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen 
          name="email-confirmation" 
          options={{ 
            headerShown: false,
            presentation: "modal"
          }} 
        />
        
        <Stack.Screen
          name="note/[id]"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="interview/[id]"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={resolved === 'dark' ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemePreferenceProvider>
        <RootTree />
      </ThemePreferenceProvider>
    </AuthProvider>
  )
}

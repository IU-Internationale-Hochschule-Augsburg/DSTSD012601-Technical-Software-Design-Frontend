import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider, ThemeContext } from '../context/ThemeContext';
import AuthProvider from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';
import { lightTheme, darkTheme } from '../theme';
import { NotificationService } from '../services/notification.service';
import { AutocompleteDropdownContextProvider } from "react-native-autocomplete-dropdown";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const RootLayoutNav = () => {
  const { themeMode } = React.useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user, isLoading, requireMfaSetup } = useAuth();
  const segments = useSegments();
  const router = useRouter();


  useEffect(() => {
    console.log('segments:', segments, 'user:', !!user, 'isLoading:', isLoading);
  }, [segments, user, isLoading]);

  // Navigation Logic based on Auth State
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      // User is not signed in and trying to access app
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      if (requireMfaSetup) {
         router.replace('/(auth)/mfa-setup');
      } else {
         // User is signed in and trying to access auth screen
         router.replace('/(tabs)');
      }
    }else if (user && !inTabsGroup && !inAuthGroup) {
      // ← OAuth-Redirect landet hier (root-level, kein Auth, kein Tabs)
      router.replace('/(tabs)');
    }
  }, [user, isLoading, requireMfaSetup, segments]);

  return (
    <PaperProvider theme={theme}>
      <Stack>
        <Stack.Screen name={"(auth)"} options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Nicht gefunden' }} />
      </Stack>
    </PaperProvider>
  );
};

export default function RootLayout() {
  const [loaded] = useFonts({
    // Standard system fonts used by default. Add custom here if needed.
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      NotificationService.init();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
      <AutocompleteDropdownContextProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </ThemeProvider>
      </AutocompleteDropdownContextProvider>
  );
}

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

  // Navigation Logic based on Auth State
  useEffect(() => {
    if (isLoading) return;

    // Cast to string[] because expo-router's generated union type doesn't include
    // runtime-valid values like '' or 'index' for the root route.
    const segs = segments as unknown as string[];
    const inTabsGroup = segs[0] === '(tabs)';
    const inAuthGroup = segs[0] === '(auth)';
    const inSubscriptionGroup = segs[0] === 'subscription';
    const onMfaSetup = inAuthGroup && segs[1] === 'mfa-setup';
    // Root path (src/app/index.tsx) is the login screen – treat as unauthenticated area
    const onRootOrIndex = segs.length === 0 || segs[0] === '' || segs[0] === 'index';
    const inUnauthenticatedArea = inAuthGroup || onRootOrIndex;

    if (user) {
      // MFA-Gate: solange offen, immer zum MFA-Screen (überall, auch in Tabs).
      if (requireMfaSetup) {
        if (!onMfaSetup) router.replace('/(auth)/mfa-setup');
        return;
      }
      // Logged-in user anywhere outside of tabs/subscription → send to dashboard
      if (!inTabsGroup && !inSubscriptionGroup) {
        router.replace('/(tabs)');
      }
    } else {
      // Logged-out user trying to access a protected area → send to login
      if (!inUnauthenticatedArea) {
        router.replace('/(auth)/login');
      }
    }
  }, [user, isLoading, requireMfaSetup, segments, router]);

  return (
    <PaperProvider theme={theme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
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

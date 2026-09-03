import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useLeaderboardSync } from '@/features/leaderboard';
import { PremiumProvider } from '@/features/premium';
import { SaveProvider } from '@/features/save';
import { ProgressionProvider } from '@/features/progression';
import { SoundProvider } from '@/features/sound';
import { syncRemoteContent } from '@/services/content';
import { AuthProvider } from '@/services/firebase/auth';
import { warmUpPlayGames } from '@/services/playGames';
import { ThemeProvider, useTheme } from '@/theme';

/** Navigator whose chrome (status bar, screen background) tracks the theme. */
function ThemedNavigator() {
  const { mode, colors } = useTheme();
  useLeaderboardSync();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.base },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Background refresh of categories/questions from Firestore. No-op offline;
    // the local seed is already rendering, so this can never block startup.
    void syncRemoteContent();
    // Arms Play Games Services' automatic zero-tap sign-in (Android builds
    // with the native module only; a safe no-op everywhere else).
    void warmUpPlayGames();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SaveProvider>
              <PremiumProvider>
                <ProgressionProvider>
                  <SoundProvider>
                    <ThemedNavigator />
                  </SoundProvider>
                </ProgressionProvider>
              </PremiumProvider>
            </SaveProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

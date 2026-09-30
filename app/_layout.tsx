import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeOut } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useLeaderboardSync } from '@/features/leaderboard';
import { useOnboardingGate } from '@/features/onboarding';
import { AnalyticsProvider } from '@/services/analytics';
import { PremiumProvider } from '@/features/premium';
import { SaveProvider } from '@/features/save';
import { ProgressionProvider } from '@/features/progression';
import { HapticsProvider } from '@/features/haptics';
import { RemindersProvider } from '@/features/reminders';
import { SoundProvider } from '@/features/sound';
import { LanguageProvider } from '@/i18n';
import { syncRemoteContent } from '@/services/content';
import { AuthProvider } from '@/services/firebase/auth';
import { warmUpPlayGames } from '@/services/playGames';
import { ThemeProvider, useTheme } from '@/theme';

/** Navigator whose chrome (status bar, screen background) tracks the theme. */
function ThemedNavigator() {
  const { mode, colors } = useTheme();
  useLeaderboardSync();
  const { decided: onboardingDecided } = useOnboardingGate();
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
        {/* First run only; no swipe-back out of it, the Skip button is the way out. */}
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
      {/* Covers the navigator until the launch decision is made, so a first
          run opens straight onto onboarding instead of a flash of the hub. */}
      {!onboardingDecided && (
        <Animated.View
          pointerEvents="none"
          exiting={FadeOut.duration(200)}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.base }]}
          testID="launch-veil"
        />
      )}
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
            <AnalyticsProvider>
              <SaveProvider>
                <PremiumProvider>
                  <ProgressionProvider>
                    <SoundProvider>
                      <HapticsProvider>
                        <RemindersProvider>
                          {/* Innermost: a language change remounts the screens
                              in the new language without resetting the
                              providers' state above them. */}
                          <LanguageProvider>
                            <ThemedNavigator />
                          </LanguageProvider>
                        </RemindersProvider>
                      </HapticsProvider>
                    </SoundProvider>
                  </ProgressionProvider>
                </PremiumProvider>
              </SaveProvider>
            </AnalyticsProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

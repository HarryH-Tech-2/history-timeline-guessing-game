import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { isFirebaseConfigured } from '@/config/env';
import { useAuth } from '@/services/firebase/auth';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';

const BENEFITS = [
  'Your progress, museum and campaign follow you to any device.',
  'Your name on the global leaderboard stays yours.',
  'One tap — no password to remember.',
];

/**
 * Account entry point: Google sign-in only. Guest progress is linked onto the
 * Google account by the auth provider, so nothing is lost by upgrading.
 * Premium never requires an account — purchases belong to the Google Play
 * account on the device — so this screen is purely about backing up progress.
 */
export function SignInScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { signInWithGoogle, hasAccount } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }, [router]);

  const continueWithGoogle = useCallback(() => {
    setBusy(true);
    setError(null);
    void signInWithGoogle()
      .then(finish)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      })
      .finally(() => setBusy(false));
  }, [signInWithGoogle, finish]);

  if (!isFirebaseConfigured) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-2 text-center text-2xl font-extrabold text-ink-primary">
            Sign in
          </Text>
          <Text className="text-center text-base text-ink-secondary">
            Accounts need a connection and are not available in this build. Your progress is
            saved on this device.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-3"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-3xl font-extrabold text-ink-primary">
            {hasAccount ? 'Switch account' : 'Back up your progress'}
          </Text>
          {router.canGoBack() && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              testID="sign-in-close"
              onPress={() => router.back()}
            >
              <Text className="text-2xl text-ink-muted">✕</Text>
            </Pressable>
          )}
        </View>

        <Text className="mb-1 text-base text-ink-secondary">
          {hasAccount
            ? 'Sign in with a different Google account.'
            : 'Sign in with Google to keep your progress safe. Your guest progress carries over.'}
        </Text>

        <View className="gap-2 border border-hair bg-bg-raised p-4">
          {BENEFITS.map((item) => (
            <Text key={item} className="text-sm text-ink-secondary">
              {'•'} {item}
            </Text>
          ))}
        </View>

        <Button
          label={busy ? 'Working…' : 'Continue with Google'}
          disabled={busy}
          onPress={continueWithGoogle}
          testID="google-sign-in"
        />
        {busy && <ActivityIndicator color={colors.accent.default} />}

        {error && (
          <Text className="text-sm font-medium" style={{ color: palette.danger }}>
            {error}
          </Text>
        )}

        <Text className="mt-2 text-xs text-ink-muted">
          Premium purchases are tied to your Google Play account, not to a sign-in. You can buy
          and restore Premium without an account.
        </Text>
      </ScrollView>
    </Screen>
  );
}

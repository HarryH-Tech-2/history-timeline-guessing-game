import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { isFirebaseConfigured } from '@/config/env';
import { useAuth } from '@/services/firebase/auth';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';

type Mode = 'sign-in' | 'create';

/**
 * Account entry point: Google sign-in plus an email/password form that toggles
 * between signing in and creating an account. Guest progress is linked onto
 * the new account by the auth provider, so nothing is lost by upgrading.
 */
export function SignInScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordReset, hasAccount } =
    useAuth();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const finish = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }, [router]);

  const run = useCallback(
    async (action: () => Promise<void>, doneNotice?: string) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await action();
        if (doneNotice) setNotice(doneNotice);
        else finish();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      } finally {
        setBusy(false);
      }
    },
    [finish],
  );

  const submitEmail = useCallback(() => {
    if (email.trim().length === 0 || password.length === 0) {
      setError('Enter your email and password.');
      return;
    }
    void run(() =>
      mode === 'create' ? signUpWithEmail(email, password) : signInWithEmail(email, password),
    );
  }, [run, mode, email, password, signUpWithEmail, signInWithEmail]);

  const forgotPassword = useCallback(() => {
    if (email.trim().length === 0) {
      setError('Enter your email first, then tap "Forgot password?".');
      return;
    }
    void run(() => sendPasswordReset(email), `Password reset email sent to ${email.trim()}.`);
  }, [run, email, sendPasswordReset]);

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

  const inputClass =
    'h-14 border border-hair bg-bg-raised px-4 text-base text-ink-primary';

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-3"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-3xl font-extrabold text-ink-primary">
            {mode === 'create' ? 'Create account' : 'Sign in'}
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
            ? 'Switch to a different account.'
            : 'Keep your progress safe across devices. Your guest progress carries over.'}
        </Text>

        <Button
          label="Continue with Google"
          variant="ghost"
          disabled={busy}
          onPress={() => void run(signInWithGoogle)}
          testID="google-sign-in"
        />

        <View className="my-2 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-hair" />
          <Text className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            or use email
          </Text>
          <View className="h-px flex-1 bg-hair" />
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.ink.muted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          editable={!busy}
          className={inputClass}
          testID="email-input"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'create' ? 'Password (6+ characters)' : 'Password'}
          placeholderTextColor={colors.ink.muted}
          autoCapitalize="none"
          autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
          secureTextEntry
          editable={!busy}
          className={inputClass}
          testID="password-input"
        />

        {error && (
          <Text className="text-sm font-medium" style={{ color: palette.danger }}>
            {error}
          </Text>
        )}
        {notice && (
          <Text className="text-sm font-medium" style={{ color: palette.success }}>
            {notice}
          </Text>
        )}

        <Button
          label={
            busy ? 'Working…' : mode === 'create' ? 'Create account' : 'Sign in'
          }
          disabled={busy}
          onPress={submitEmail}
          testID="email-submit"
        />
        {busy && <ActivityIndicator color={colors.accent.default} />}

        <View className="mt-2 flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMode(mode === 'create' ? 'sign-in' : 'create');
              setError(null);
              setNotice(null);
            }}
            disabled={busy}
            testID="mode-toggle"
          >
            <Text className="text-sm font-semibold text-accent">
              {mode === 'create' ? 'Have an account? Sign in' : 'New here? Create an account'}
            </Text>
          </Pressable>
          {mode === 'sign-in' && (
            <Pressable
              accessibilityRole="button"
              onPress={forgotPassword}
              disabled={busy}
              testID="forgot-password"
            >
              <Text className="text-sm font-semibold text-ink-muted">Forgot password?</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { isFirebaseConfigured } from '@/config/env';
import { forgetUser } from '@/features/save/SaveProvider';
import { useAuth } from '@/services/firebase/auth';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';

const DELETED_ITEMS = [
  'Your sign-in (email or Google link). You will not be able to sign in to it again.',
  'Cloud saves: XP, level, coins, hearts, museum, campaign progress and best scores.',
  'Your row on the global leaderboard.',
  'The copy of that progress on this device.',
];

/**
 * Permanent account deletion, as required by Google Play. The player confirms
 * with a native dialog, re-proves their identity (password, or a silent Google
 * check), and only then are local saves, cloud data and the Firebase user
 * removed: local first so no debounced write can re-mirror deleted data, and
 * the auth user last so a failure never leaves orphaned data.
 */
export function DeleteAccountScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { uid, user, hasAccount, reauthenticate, deleteAccount } = useAuth();

  const needsPassword = user?.providerIds.includes('password') ?? false;
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDeletion = useCallback(async () => {
    if (uid === null) return;
    setBusy(true);
    setError(null);
    try {
      await reauthenticate(needsPassword ? password : undefined);
      await forgetUser(uid);
      await deleteAccount();
      router.replace('/profile');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      setBusy(false);
    }
  }, [uid, reauthenticate, needsPassword, password, deleteAccount, router]);

  const confirm = useCallback(() => {
    if (needsPassword && password.length === 0) {
      setError('Enter your password to confirm.');
      return;
    }
    Alert.alert(
      'Delete your account?',
      'This permanently removes your account and all of its progress. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void runDeletion() },
      ],
    );
  }, [needsPassword, password, runDeletion]);

  if (!isFirebaseConfigured || !hasAccount) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-2 text-center text-2xl font-extrabold text-ink-primary">
            Delete account
          </Text>
          <Text className="text-center text-base text-ink-secondary">
            {isFirebaseConfigured
              ? 'You are playing as a guest, so there is no account to delete. Uninstalling the app removes your on-device progress.'
              : 'Accounts are not available in this build.'}
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
          <Text className="text-3xl font-extrabold text-ink-primary">Delete account</Text>
          {router.canGoBack() && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              testID="delete-account-close"
              onPress={() => router.back()}
              disabled={busy}
            >
              <Text className="text-2xl text-ink-muted">✕</Text>
            </Pressable>
          )}
        </View>

        <Text className="text-base text-ink-secondary" numberOfLines={1}>
          Signed in as {user?.email ?? user?.displayName ?? uid}
        </Text>

        <View className="gap-2 border border-hair bg-bg-raised p-4">
          <Text className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
            This will permanently delete
          </Text>
          {DELETED_ITEMS.map((item) => (
            <Text key={item} className="text-sm text-ink-secondary">
              {'•'} {item}
            </Text>
          ))}
          <Text className="mt-1 text-xs text-ink-muted">
            Purchases are managed by Google Play and are not affected. An active Premium
            subscription must be cancelled separately in the Play Store.
          </Text>
        </View>

        {needsPassword && (
          <View className="relative">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Confirm your password"
              placeholderTextColor={colors.ink.muted}
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry={!showPassword}
              editable={!busy}
              className="h-14 border border-hair bg-bg-raised px-4 pr-16 text-base text-ink-primary"
              testID="delete-password-input"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
              className="absolute bottom-0 right-0 top-0 justify-center px-4"
              testID="delete-password-visibility"
            >
              <Text className="text-sm font-semibold text-accent">
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          </View>
        )}

        {error && (
          <Text className="text-sm font-medium" style={{ color: palette.danger }}>
            {error}
          </Text>
        )}

        <Button
          label={busy ? 'Deleting…' : 'Delete my account'}
          variant="ghost"
          disabled={busy}
          onPress={confirm}
          testID="delete-account-submit"
        />
        {busy && <ActivityIndicator color={colors.accent.default} />}
      </ScrollView>
    </Screen>
  );
}

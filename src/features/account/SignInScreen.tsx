import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackButton, Button, Screen } from '@/components/ui';
import { isFirebaseConfigured } from '@/config/env';
import { STORE_LABEL } from '@/config/store';
import { t } from '@/i18n';
import {
  isAppleSignInAvailable,
  loadAppleAuthentication,
  type AppleAuthenticationModule,
} from '@/services/appleSignin';
import { useAuth } from '@/services/firebase/auth';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';

/** The reasons to back up. A function so it follows the language. */
function benefits(): string[] {
  return [
    t('account.signIn.benefits.devices'),
    t('account.signIn.benefits.name'),
    t('account.signIn.benefits.oneTap'),
  ];
}

/**
 * The Sign in with Apple module, loaded only on iOS devices that support it;
 * null everywhere else (and until the check finishes).
 */
function useAppleAuthentication(): AppleAuthenticationModule | null {
  const [apple, setApple] = useState<AppleAuthenticationModule | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    void isAppleSignInAvailable().then((available) => {
      if (available && !cancelled) setApple(loadAppleAuthentication());
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return apple;
}

/**
 * Account entry point: Google everywhere, plus Sign in with Apple on iOS.
 * Guest progress is linked onto the account by the auth provider, so nothing
 * is lost by upgrading. Premium never requires an account — purchases belong
 * to the store account on the device — so this screen is purely about backing
 * up progress.
 */
export function SignInScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { signInWithGoogle, signInWithApple, hasAccount } = useAuth();
  const apple = useAppleAuthentication();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }, [router]);

  const run = useCallback(
    (signIn: () => Promise<void>) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      void signIn()
        .then(finish)
        .catch((caught: unknown) => {
          setError(caught instanceof Error ? caught.message : t('account.somethingWrong'));
        })
        .finally(() => setBusy(false));
    },
    [busy, finish],
  );
  const continueWithGoogle = useCallback(() => run(signInWithGoogle), [run, signInWithGoogle]);
  const continueWithApple = useCallback(() => run(signInWithApple), [run, signInWithApple]);

  if (!isFirebaseConfigured) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-2 text-center text-2xl font-extrabold text-ink-primary">
            {t('account.signIn.title')}
          </Text>
          <Text className="text-center text-base text-ink-secondary">
            {t('account.signIn.offline')}
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
            {hasAccount ? t('account.signIn.switchTitle') : t('account.signIn.backupTitle')}
          </Text>
          {router.canGoBack() && (
            <BackButton onPress={() => router.back()} variant="close" testID="sign-in-close" />
          )}
        </View>

        <Text className="mb-1 text-base text-ink-secondary">
          {hasAccount
            ? t('account.signIn.switchBody')
            : t('account.signIn.backupBody', {
                providers: t(apple ? 'store.backupProvidersIos' : 'store.backupProvidersAndroid'),
              })}
        </Text>

        <View className="gap-2 border border-hair bg-bg-raised p-4">
          {benefits().map((item) => (
            <Text key={item} className="text-sm text-ink-secondary">
              {'•'} {item}
            </Text>
          ))}
        </View>

        {apple && (
          // Apple's own button: its guidelines require this exact look.
          <apple.AppleAuthenticationButton
            buttonType={apple.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={apple.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={0}
            style={{ height: 50 }}
            onPress={continueWithApple}
          />
        )}
        <Button
          label={busy ? t('account.signIn.working') : t('account.signIn.google')}
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
          {t('account.signIn.purchasesNote', { store: STORE_LABEL })}
        </Text>
      </ScrollView>
    </Screen>
  );
}

import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { SignInNudge } from '@/features/account/SignInNudge';
import { track } from '@/services/analytics';

import * as api from './api';
import { normaliseCode } from './shareInvite';

/** Join confirmation for a group invite link or typed code; joining happens only on tap. */
export function JoinGroupScreen({ code, via }: { code: string; via: 'link' | 'code' }) {
  const router = useRouter();
  const invite = normaliseCode(code);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A cold app-link open has no history to go back to.
  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const join = async () => {
    if (!invite) return;
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await api.joinGroup(invite);
      track('group_joined', { via });
      router.replace({ pathname: '/group/[id]', params: { id: groupId } });
    } catch (e) {
      setError(api.socialErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen className="justify-center gap-4 px-5">
      <SignInNudge milestone="social-groups" active />
      <Text className="text-center text-2xl font-extrabold text-ink-primary">Join this group?</Text>
      <Text className="text-center text-lg tracking-widest text-ink-secondary">{invite ?? code}</Text>
      {!invite && (
        <Text className="text-center text-danger">That doesn’t look like a group code.</Text>
      )}
      {error && <Text className="text-center text-danger">{error}</Text>}
      <View className="gap-2">
        {invite && (
          <Button label="Join group" onPress={() => void join()} disabled={busy} testID="group-join" />
        )}
        <Button label="Not now" variant="ghost" onPress={leave} />
      </View>
    </Screen>
  );
}

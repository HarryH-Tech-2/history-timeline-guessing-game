import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { BackButton, Button, Screen } from '@/components/ui';
import { HOUSE_PREFIX } from '@/features/leaderboard/houseRows';
import { handleForUid } from '@/features/leaderboard/types';
import { track } from '@/services/analytics';
import { useAuth } from '@/services/firebase/auth';
import { weekKey } from '@/utils/date';

import * as api from './api';
import { rankGroup, type MemberRow } from './groupBoard';
import { groupUrl, shareGroup } from './shareInvite';
import type { Group } from './types';

type Load =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'gone' }
  | { kind: 'ready'; group: Group; board: (MemberRow & { rank: number })[] };

/** Rejects when Firestore is unreachable; a group the player left resolves to 'gone'. */
async function fetchLoad(groupId: string): Promise<Load> {
  const group = groupId ? await api.fetchGroup(groupId) : null;
  if (!group) return { kind: 'gone' };
  const rows = await api.fetchMemberRows(group.memberUids.filter((uid) => !uid.startsWith(HOUSE_PREFIX)));
  return { kind: 'ready', group, board: rankGroup(group.memberUids, rows, weekKey(), handleForUid) };
}

export function GroupScreen({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { uid } = useAuth();
  // Opened from a join link, there may be no history to go back to.
  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      fetchLoad(groupId).then(
        (next) => live && setLoad(next),
        () => live && setLoad({ kind: 'error' }),
      );
      return () => {
        live = false;
      };
      // `attempt` re-runs the load when Try again is tapped.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId, attempt]),
  );

  const retry = () => {
    setLoad({ kind: 'loading' });
    setAttempt((n) => n + 1);
  };

  const confirmLeave = (group: Group) =>
    Alert.alert(`Leave ${group.name}?`, 'You’ll need a new invite to rejoin.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => void leaveGroup(group) },
    ]);

  const leaveGroup = async (group: Group) => {
    setLeaving(true);
    setError(null);
    try {
      await api.leaveGroup(group.id);
      track('group_left');
      leave();
    } catch (e) {
      setError(api.socialErrorMessage(e));
      setLeaving(false);
    }
  };

  if (load.kind === 'loading') {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }
  if (load.kind === 'error') {
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        <Text className="text-center text-lg text-ink-primary">{api.socialErrorMessage(null)}</Text>
        <Button label="Try again" onPress={retry} testID="group-retry" />
        <Button label="Back" variant="ghost" onPress={leave} />
      </Screen>
    );
  }
  if (load.kind === 'gone') {
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        <Text className="text-center text-lg text-ink-primary">You’re not in this group any more.</Text>
        <Button label="Back" onPress={leave} />
      </Screen>
    );
  }

  const { group, board } = load;
  return (
    <Screen>
      <FlatList
        data={board}
        keyExtractor={(m) => m.uid}
        contentContainerClassName="gap-2 px-5 pb-10 pt-3"
        ListHeaderComponent={
          <View className="gap-3 pb-3">
            <View className="flex-row items-center gap-2">
              <BackButton onPress={leave} />
              <Text className="flex-1 text-2xl font-extrabold text-ink-primary">{group.name}</Text>
            </View>
            <Text className="text-sm text-ink-secondary">This week’s XP · resets Monday</Text>
            <Button
              label={`Invite · code ${group.inviteCode}`}
              onPress={() => void shareGroup(groupUrl(group.inviteCode), group.name)}
              testID="group-invite"
            />
          </View>
        }
        renderItem={({ item }) => (
          <View
            className={`flex-row items-center justify-between border p-3 ${item.uid === uid ? 'border-accent bg-accent/10' : 'border-hair bg-bg-raised'}`}
          >
            <Text className="flex-1 pr-3 text-base font-bold text-ink-primary" numberOfLines={1}>
              {item.rank}. {item.name}
            </Text>
            <Text className="text-base font-bold text-ink-primary">{item.weekXp.toLocaleString()} XP</Text>
          </View>
        )}
        ListFooterComponent={
          <View className="gap-2 pt-6">
            {error && <Text className="text-center text-sm text-danger">{error}</Text>}
            <Button
              label="Leave group"
              variant="ghost"
              testID="group-leave"
              disabled={leaving}
              onPress={() => confirmLeave(group)}
            />
          </View>
        }
      />
    </Screen>
  );
}

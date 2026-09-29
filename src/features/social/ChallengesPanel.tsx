import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from '@/components/ui';
import { resolveDisplayName } from '@/features/leaderboard/playerName';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { track } from '@/services/analytics';
import { useAuth } from '@/services/firebase/auth';

import * as api from './api';
import { CodeEntry } from './CodeEntry';
import { compareEntries, statusLine } from './headToHead';
import { shareChallenge } from './shareInvite';
import type { Challenge, ChallengeEntry } from './types';
import { noteChallengeSeen } from './useSocialBadge';

type Row = { challenge: Challenge; entries: ChallengeEntry[] };

/** Newest first; older ones stay reachable by code. */
const MAX_ROWS = 20;

async function loadRow(uid: string, code: string, seen: number | undefined): Promise<Row | null> {
  try {
    const [challenge, entries] = await Promise.all([api.fetchChallenge(code), api.fetchEntries(code)]);
    if (!challenge) return null;
    // Only write when the count moved, not for every row on every focus.
    if (seen !== entries.length) api.markSeen(uid, code, entries.length).catch(() => undefined);
    // Clear the Social tab dot now rather than at the next foreground check.
    noteChallengeSeen(uid, code, entries.length);
    return { challenge, entries };
  } catch {
    return null; // one unreadable challenge shouldn't hide the rest
  }
}

export function ChallengesPanel() {
  const router = useRouter();
  const { uid } = useAuth();
  const { state } = useProgression();
  const name = resolveDisplayName(state.displayName, uid);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      let live = true;
      void (async () => {
        try {
          const social = await api.fetchSocialState(uid);
          const loaded = await Promise.all(
            [...social.challengeCodes].reverse().slice(0, MAX_ROWS).map((code) => loadRow(uid, code, social.seen[code])),
          );
          if (!live) return;
          setRows(loaded.filter((r): r is Row => r !== null));
          setLoadError(false);
        } catch {
          if (live) setLoadError(true);
        }
      })();
      return () => {
        live = false;
      };
      // `attempt` re-runs the load when Retry is tapped.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid, attempt]),
  );

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { code, url } = await api.createChallenge({ name });
      track('challenge_created', { source: 'random' });
      await shareChallenge(url, name);
      router.push({ pathname: '/c/[code]', params: { code } });
    } catch (e) {
      setError(api.socialErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlatList
      testID="challenges-panel"
      data={rows}
      keyExtractor={(r) => r.challenge.code}
      contentContainerClassName="gap-3 px-5 pb-10 pt-2"
      ListHeaderComponent={
        <View className="gap-3 pb-2">
          <Button
            label="⚔️ Challenge a friend"
            onPress={() => void create()}
            disabled={busy}
            testID="challenge-create"
          />
          <CodeEntry
            label="Play"
            testID="challenge-code"
            onCode={(code) => router.push({ pathname: '/c/[code]', params: { code, via: 'code' } })}
          />
          {error && <Text className="text-sm text-danger">{error}</Text>}
          {loadError && (
            <View className="gap-2">
              <Text className="text-sm text-danger">{api.socialErrorMessage(null)}</Text>
              <Button
                label="Try again"
                variant="ghost"
                onPress={() => setAttempt((n) => n + 1)}
                testID="challenges-retry"
              />
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        loadError ? null : (
          <Text className="py-10 text-center text-ink-secondary">
            Challenge a friend to the same 8 questions and see who knows their history.
          </Text>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/c/[code]', params: { code: item.challenge.code } })}
          className="flex-row items-center justify-between border border-hair bg-bg-raised p-4"
          testID={`challenge-row-${item.challenge.code}`}
        >
          <View className="flex-1 pr-3">
            <Text className="text-base font-bold text-ink-primary">
              {item.challenge.creatorUid === uid
                ? 'Your challenge'
                : `${item.challenge.creatorName}’s challenge`}
            </Text>
            <Text className="text-sm text-ink-secondary">
              {statusLine(compareEntries(item.challenge, item.entries, uid ?? ''), item.challenge.creatorName)}
            </Text>
          </View>
          <Text className="text-lg font-bold tracking-widest text-ink-muted">{item.challenge.code}</Text>
        </Pressable>
      )}
    />
  );
}

import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from '@/components/ui';
import { SignInNudge } from '@/features/account/SignInNudge';
import { track } from '@/services/analytics';
import { useAuth } from '@/services/firebase/auth';

import * as api from './api';
import { CodeEntry } from './CodeEntry';
import { shareGroup } from './shareInvite';
import type { Group } from './types';

export function GroupsPanel() {
  const router = useRouter();
  const { uid } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      let live = true;
      void (async () => {
        try {
          const social = await api.fetchSocialState(uid);
          // fetchGroup resolves null for a group the player has left.
          const loaded = await Promise.all(social.groupIds.map((id) => api.fetchGroup(id)));
          if (!live) return;
          setGroups(loaded.filter((g): g is Group => g !== null));
          setLoadError(false);
        } catch {
          if (live) setLoadError(true);
        } finally {
          if (live) setLoading(false);
        }
      })();
      return () => {
        live = false;
      };
      // `attempt` re-runs the load when Try again is tapped.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid, attempt]),
  );

  const create = async () => {
    const trimmed = name.trim();
    setBusy(true);
    setError(null);
    try {
      const { groupId, url } = await api.createGroup(trimmed);
      track('group_created');
      await shareGroup(url, trimmed);
      setName('');
      router.push({ pathname: '/group/[id]', params: { id: groupId } });
    } catch (e) {
      setError(api.socialErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlatList
      testID="groups-panel"
      data={groups}
      keyExtractor={(g) => g.id}
      contentContainerClassName="gap-3 px-5 pb-10 pt-2"
      ListHeaderComponent={
        <View className="gap-3 pb-2">
          {/* Guests only (the nudge checks), once: back up before groups are tied to this phone. */}
          <SignInNudge milestone="social-groups" active />
          <View className="flex-row items-center gap-2">
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={24}
              placeholder="New group name"
              testID="group-name-input"
              className="h-12 flex-1 border border-hair bg-bg-raised px-3 text-base text-ink-primary"
            />
            <View className="w-28">
              <Button
                label="Create"
                onPress={() => void create()}
                disabled={busy || name.trim().length < 3}
                testID="group-create"
              />
            </View>
          </View>
          <CodeEntry
            label="Join"
            testID="group-code"
            onCode={(code) => router.push({ pathname: '/g/[code]', params: { code, via: 'code' } })}
          />
          {error && <Text className="text-sm text-danger">{error}</Text>}
          {loadError && (
            <View className="gap-2">
              <Text className="text-sm text-danger">{api.socialErrorMessage(null)}</Text>
              <Button
                label="Try again"
                variant="ghost"
                onPress={() => {
                  setLoading(true);
                  setAttempt((n) => n + 1);
                }}
                testID="groups-retry"
              />
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        loadError ? null : loading && uid ? (
          <ActivityIndicator className="py-10" />
        ) : (
          <Text className="py-10 text-center text-ink-secondary">
            Make a group for family, friends or work and compete on this week’s XP.
          </Text>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/group/[id]', params: { id: item.id } })}
          className="flex-row items-center justify-between border border-hair bg-bg-raised p-4"
          testID={`group-row-${item.id}`}
        >
          <Text className="flex-1 pr-3 text-base font-bold text-ink-primary" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-sm text-ink-muted">{item.memberUids.length} {item.memberUids.length === 1 ? 'member' : 'members'} ›</Text>
        </Pressable>
      )}
    />
  );
}

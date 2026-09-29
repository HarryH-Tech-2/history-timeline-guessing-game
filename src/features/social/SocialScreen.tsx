import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/ui';
import { LeaderboardScreen } from '@/features/leaderboard/LeaderboardScreen';

import { ChallengesPanel } from './ChallengesPanel';
import { GroupsPanel } from './GroupsPanel';
import { SegmentTabs } from './SegmentTabs';
import { socialViewStore, type SocialSegment } from './socialView';

export type { SocialSegment };

const SEGMENTS = [
  { value: 'global', label: 'Global' },
  { value: 'groups', label: 'Groups' },
  { value: 'challenges', label: 'Challenges' },
] as const;

/** The Social tab: the global leaderboard, private groups and head-to-head challenges. */
export function SocialScreen() {
  const [segment, setSegment] = useState<SocialSegment>('global');
  // A tap made before the saved choice loads must win over the restore.
  const chosen = useRef(false);

  useEffect(() => {
    let active = true;
    void socialViewStore.read().then((view) => {
      if (active && !chosen.current) setSegment(view.segment);
    });
    return () => {
      active = false;
    };
  }, []);

  const choose = useCallback((next: SocialSegment) => {
    chosen.current = true;
    setSegment(next);
    void socialViewStore.write({ segment: next });
  }, []);

  return (
    <Screen edges={['top']}>
      <View className="px-5 pb-2 pt-3">
        <SegmentTabs value={segment} options={SEGMENTS} onChange={choose} />
      </View>
      <View className="flex-1">
        {segment === 'global' && <LeaderboardScreen embedded />}
        {segment === 'groups' && <GroupsPanel />}
        {segment === 'challenges' && <ChallengesPanel />}
      </View>
    </Screen>
  );
}

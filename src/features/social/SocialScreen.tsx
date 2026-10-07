import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/ui';
import { LeaderboardScreen } from '@/features/leaderboard/LeaderboardScreen';
import { t } from '@/i18n';

import { ChallengesPanel } from './ChallengesPanel';
import { GroupsPanel } from './GroupsPanel';
import { SegmentTabs } from './SegmentTabs';
import type { SocialSegment } from './socialView';

export type { SocialSegment };

/** The Social tab: the global leaderboard, private groups and head-to-head challenges. */
export function SocialScreen() {
  // Always opens on the global board (All time); a segment the player picks
  // lasts until the app restarts.
  const [segment, setSegment] = useState<SocialSegment>('global');

  return (
    <Screen edges={['top']}>
      <View className="px-5 pb-2 pt-3">
        <SegmentTabs
          value={segment}
          options={[
            { value: 'global', label: t('social.segments.global') },
            { value: 'groups', label: t('social.segments.groups') },
            { value: 'challenges', label: t('social.segments.challenges') },
          ]}
          onChange={setSegment}
        />
      </View>
      <View className="flex-1">
        {segment === 'global' && <LeaderboardScreen embedded />}
        {segment === 'groups' && <GroupsPanel />}
        {segment === 'challenges' && <ChallengesPanel />}
      </View>
    </Screen>
  );
}

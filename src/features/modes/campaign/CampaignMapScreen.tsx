import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { isPremiumCategory } from '@/data';
import { usePremium } from '@/features/premium';
import { useSaves } from '@/features/save';
import { useThemeColors } from '@/theme';

import type { CampaignProgress } from '../persistence';
import {
  CAMPAIGN,
  isStageUnlocked,
  type CampaignStage,
  type CampaignWorld,
} from './campaignMap';

function StageTile({
  stage,
  colour,
  unlocked,
  stars,
  onPress,
}: {
  stage: CampaignStage;
  colour: string;
  unlocked: boolean;
  stars: number;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      disabled={!unlocked}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${stage.title}${unlocked ? '' : ', locked'}`}
      testID={`stage-${stage.id}`}
      className="flex-row items-center justify-between border border-hair bg-bg-raised px-4 py-3"
      style={{ opacity: unlocked ? 1 : 0.45 }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${colour}22` }}
        >
          <Text className="text-sm font-bold" style={{ color: colour }}>
            {unlocked ? stage.index : '🔒'}
          </Text>
        </View>
        <Text className="text-sm font-semibold text-ink-primary">{`Stage ${stage.index}`}</Text>
      </View>
      <Text className="text-sm" style={{ color: stars > 0 ? colour : colors.hair }}>
        {'★'.repeat(stars)}
        <Text style={{ color: colors.hair }}>{'★'.repeat(3 - stars)}</Text>
      </Text>
    </Pressable>
  );
}

function WorldSection({
  world,
  progress,
  premiumLocked,
  onOpenStage,
  onOpenPaywall,
}: {
  world: CampaignWorld;
  progress: CampaignProgress;
  /** The world's category is Premium and the player isn't subscribed. */
  premiumLocked: boolean;
  onOpenStage: (stage: CampaignStage) => void;
  onOpenPaywall: () => void;
}) {
  return (
    <View className="gap-3" testID={`world-${world.id}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full" style={{ backgroundColor: world.colour }} />
          <Text className="text-lg font-bold text-ink-primary">{world.name}</Text>
        </View>
        {premiumLocked && (
          <Pressable
            onPress={onOpenPaywall}
            accessibilityRole="button"
            accessibilityLabel={`${world.name} is a Premium world`}
            className="border border-accent bg-accent/10 px-2 py-0.5"
          >
            <Text className="text-[11px] font-bold uppercase tracking-wide text-accent">
              🔒 Premium
            </Text>
          </Pressable>
        )}
      </View>
      <View className="gap-2">
        {world.stages.map((stage) => (
          <StageTile
            key={stage.id}
            stage={stage}
            colour={world.colour}
            unlocked={!premiumLocked && isStageUnlocked(stage.id, progress)}
            stars={progress[stage.id]?.stars ?? 0}
            onPress={() => onOpenStage(stage)}
          />
        ))}
      </View>
    </View>
  );
}

/** The campaign map: worlds and their stages, gated by star progress. */
export function CampaignMapScreen() {
  const router = useRouter();
  const { isPremium } = usePremium();
  const { isReady, campaign } = useSaves();
  const [progress, setProgress] = useState<CampaignProgress>({});

  useFocusEffect(
    useCallback(() => {
      if (!isReady) return;
      let active = true;
      void campaign.read().then((p) => {
        if (active) setProgress(p);
      });
      return () => {
        active = false;
      };
    }, [isReady, campaign]),
  );

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-2 pb-8 gap-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
          >
            <Text className="text-xl text-ink-muted">‹</Text>
          </Pressable>
          <Text className="text-2xl font-extrabold text-ink-primary">Campaign</Text>
        </View>

        {CAMPAIGN.map((world) => (
          <WorldSection
            key={world.id}
            world={world}
            progress={progress}
            premiumLocked={isPremiumCategory(world.categoryId) && !isPremium}
            onOpenPaywall={() => router.push('/paywall')}
            onOpenStage={(stage) =>
              router.push({
                pathname: '/campaign/[world]/[stage]',
                params: { world: world.id, stage: stage.id },
              })
            }
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

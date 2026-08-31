import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { useSaves } from '@/features/save';
import { useThemeColors } from '@/theme';

import type { CampaignProgress } from '../persistence';
import {
  allStages,
  CAMPAIGN,
  isStageUnlocked,
  type CampaignStage,
  type CampaignWorld,
} from './campaignMap';

/**
 * The campaign map: full-width era plaques introduce each period, with the
 * era's stages listed beneath as tappable medallions.
 */

/** Medallion diameter. */
const NODE = 48;
/** Ink dark enough to read on every era colour fill. */
const INK_ON_COLOUR = '#1D1712';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Soft expanding ring on the next playable stage. */
function FrontierPulse({ colour }: { colour: string }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + t.value * 0.45 }],
    opacity: 0.5 * (1 - t.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: 'absolute',
          width: NODE,
          height: NODE,
          borderRadius: NODE / 2,
          borderWidth: 2,
          borderColor: colour,
        },
      ]}
    />
  );
}

/** Museum plaque introducing an era: numeral, year span, name, star tally. */
function EraBanner({
  world,
  earned,
  total,
}: {
  world: CampaignWorld;
  earned: number;
  total: number;
}) {
  return (
    <View className="pb-3 pt-6" testID={`world-${world.id}`}>
      <View
        className="border border-hair bg-bg-raised px-4 py-3"
        style={{ borderLeftWidth: 4, borderLeftColor: world.colour }}
      >
        <Text
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: world.colour }}
        >
          Era {ROMAN[world.index - 1] ?? world.index} · {world.period}
        </Text>
        <View className="flex-row items-end justify-between">
          <Text className="text-xl font-extrabold text-ink-primary">{world.name}</Text>
          <Text className="text-xs font-semibold text-ink-muted">
            ★ {earned} / {total}
          </Text>
        </View>
      </View>
    </View>
  );
}

function StageRow({
  stage,
  colour,
  unlocked,
  frontier,
  stars,
  index,
  onPress,
}: {
  stage: CampaignStage;
  colour: string;
  unlocked: boolean;
  /** The next stage to play: pulsing ring and a Play chip. */
  frontier: boolean;
  stars: number;
  index: number;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const done = stars > 0;

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 10) * 30).springify().damping(18)}>
      <Pressable
        disabled={!unlocked}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${stage.title}${unlocked ? '' : ', locked'}`}
        testID={`stage-${stage.id}`}
        className="relative flex-row items-center gap-4 py-3"
      >
        {/* Stage medallion */}
        <View
          className="items-center justify-center"
          style={{
            width: NODE,
            height: NODE,
            borderRadius: NODE / 2,
            borderWidth: 2,
            borderColor: unlocked ? colour : colors.hair,
            backgroundColor: done ? colour : unlocked ? `${colour}26` : colors.bg.raised,
            opacity: unlocked ? 1 : 0.6,
          }}
        >
          {frontier && !reducedMotion && <FrontierPulse colour={colour} />}
          <Text
            className="text-base font-extrabold"
            style={{
              color: done ? INK_ON_COLOUR : unlocked ? colour : colors.ink.muted,
              includeFontPadding: false,
            }}
          >
            {unlocked ? (stars === 3 ? '★' : stage.index) : '🔒'}
          </Text>
        </View>

        <View className="flex-1" style={{ opacity: unlocked ? 1 : 0.55 }}>
          <Text className="text-base font-bold text-ink-primary">{`Stage ${stage.index}`}</Text>
          <Text className="text-xs text-ink-muted">
            {!unlocked
              ? 'Earn a star on the stage before'
              : frontier
                ? 'Up next'
                : done
                  ? 'Cleared'
                  : 'Not attempted'}
          </Text>
        </View>

        {frontier ? (
          <View className="px-3 py-1.5" style={{ backgroundColor: colour }}>
            <Text
              className="text-xs font-extrabold uppercase tracking-wide"
              style={{ color: INK_ON_COLOUR }}
            >
              Play
            </Text>
          </View>
        ) : (
          unlocked && (
            <Text className="text-base" style={{ color: done ? colour : colors.hair }}>
              {'★'.repeat(stars)}
              <Text style={{ color: colors.hair }}>{'☆'.repeat(3 - stars)}</Text>
            </Text>
          )
        )}
      </Pressable>
    </Animated.View>
  );
}

/** The campaign map: a single timeline of era worlds, gated by star progress. */
export function CampaignMapScreen() {
  const router = useRouter();
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

  const stages = allStages();
  const frontierId = stages.find(
    (s) => isStageUnlocked(s.id, progress) && (progress[s.id]?.stars ?? 0) === 0,
  )?.id;
  const totalStars = stages.reduce((n, s) => n + (progress[s.id]?.stars ?? 0), 0);
  /** Global play-order position of each stage, for the entrance stagger. */
  const orderOf = new Map(stages.map((s, i) => [s.id, i]));

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-2 pb-10"
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
          <Text className="flex-1 text-2xl font-extrabold text-ink-primary">Campaign</Text>
          <Text className="text-sm font-semibold text-ink-muted">
            ★ {totalStars} / {stages.length * 3}
          </Text>
        </View>
        <Text className="mt-1 text-sm text-ink-secondary">
          March through five eras of history. Earn a star to open the next stage.
        </Text>

        {CAMPAIGN.map((world) => {
          const earned = world.stages.reduce(
            (n, s) => n + (progress[s.id]?.stars ?? 0),
            0,
          );
          return (
            <View key={world.id}>
              <EraBanner world={world} earned={earned} total={world.stages.length * 3} />
              {world.stages.map((stage) => {
                const index = orderOf.get(stage.id) ?? 0;
                return (
                  <StageRow
                    key={stage.id}
                    stage={stage}
                    colour={world.colour}
                    unlocked={isStageUnlocked(stage.id, progress)}
                    frontier={stage.id === frontierId}
                    stars={progress[stage.id]?.stars ?? 0}
                    index={index}
                    onPress={() =>
                      router.push({
                        pathname: '/campaign/[world]/[stage]',
                        params: { world: world.id, stage: stage.id },
                      })
                    }
                  />
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

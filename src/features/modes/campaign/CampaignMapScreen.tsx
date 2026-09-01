import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
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
 * The campaign map: an aged parchment chart the player marches up, era by
 * era. Each era opens with a museum plaque, then its stages sit as medallions
 * along a winding dotted trail drawn over the map artwork.
 */

/** Medallion diameter. */
const NODE = 56;
/** Vertical distance between one stage medallion and the next. */
const STEP_Y = 92;
/** Ink dark enough to read on every era colour fill. */
const INK_ON_COLOUR = '#1D1712';
/** How far (fraction of the usable half-width) the trail swings side to side. */
const SWING = 0.72;
/** Dots drawn between consecutive medallions. */
const TRAIL_DOTS = 5;

const MAP_BG = require('../../../../assets/campaign-map-bg.jpg');
/** Aspect ratio (h/w) of the parchment artwork, for seamless-ish tiling. */
const MAP_TILE_RATIO = 2061 / 1080;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Horizontal centre (px) of the k-th medallion on the era's winding trail. */
function trailX(globalIndex: number, width: number): number {
  const amplitude = (width / 2 - NODE / 2 - 24) * SWING;
  return width / 2 + amplitude * Math.sin(globalIndex * 1.05 + 0.6);
}

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
    <View className="px-5 pb-1 pt-6" testID={`world-${world.id}`}>
      <View
        className="border border-hair bg-bg-raised/95 px-4 py-3"
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

/** A stage medallion pinned to the map, with its star tally beneath. */
function StageNode({
  stage,
  colour,
  unlocked,
  frontier,
  stars,
  x,
  y,
  onPress,
}: {
  stage: CampaignStage;
  colour: string;
  unlocked: boolean;
  /** The next stage to play: pulsing ring and a Play chip. */
  frontier: boolean;
  stars: number;
  /** Centre of the medallion, in the era panel's coordinates. */
  x: number;
  y: number;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const done = stars > 0;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: x - NODE / 2,
        top: y - NODE / 2,
        alignItems: 'center',
      }}
    >
      <Pressable
        disabled={!unlocked}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Stage ${stage.index}${unlocked ? '' : ', locked'}`}
        testID={`stage-${stage.id}`}
        hitSlop={8}
        className="items-center justify-center"
        style={{
          width: NODE,
          height: NODE,
          borderRadius: NODE / 2,
          borderWidth: 3,
          borderColor: unlocked ? colour : colors.hair,
          backgroundColor: done ? colour : colors.bg.raised,
          opacity: unlocked ? 1 : 0.55,
          // A soft ground shadow so medallions sit "on" the parchment.
          elevation: unlocked ? 4 : 0,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        {frontier && !reducedMotion && <FrontierPulse colour={colour} />}
        <Text
          className="text-lg font-extrabold"
          style={{
            color: done ? INK_ON_COLOUR : unlocked ? colour : colors.ink.muted,
            includeFontPadding: false,
          }}
        >
          {unlocked ? (stars === 3 ? '★' : stage.index) : '🔒'}
        </Text>
      </Pressable>

      {/* Star tally (or Play prompt) on a small plate under the medallion. */}
      {frontier ? (
        <View className="mt-1 px-2 py-0.5" style={{ backgroundColor: colour }}>
          <Text
            className="text-[10px] font-extrabold uppercase tracking-wide"
            style={{ color: INK_ON_COLOUR, includeFontPadding: false }}
          >
            Play
          </Text>
        </View>
      ) : (
        unlocked && (
          <View className="mt-1 bg-bg-raised/90 px-1.5 py-0.5">
            <Text className="text-[11px]" style={{ color: done ? colour : colors.hair }}>
              {'★'.repeat(stars)}
              <Text style={{ color: colors.hair }}>{'☆'.repeat(3 - stars)}</Text>
            </Text>
          </View>
        )
      )}
    </View>
  );
}

/** Dotted trail segment between two medallion centres. */
function TrailDots({
  from,
  to,
  colour,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  colour: string;
}) {
  return (
    <>
      {Array.from({ length: TRAIL_DOTS }, (_, i) => {
        const t = (i + 1) / (TRAIL_DOTS + 1);
        return (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: from.x + (to.x - from.x) * t - 2.5,
              top: from.y + (to.y - from.y) * t - 2.5,
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: colour,
              opacity: 0.55,
            }}
          />
        );
      })}
    </>
  );
}

/**
 * One era's stretch of the trail: an absolutely-positioned panel whose height
 * comes from the stage count, with medallions swinging left and right along a
 * sine path. `startIndex` keeps the swing phase continuous across eras so the
 * whole campaign reads as one road.
 */
function EraTrail({
  world,
  startIndex,
  width,
  progress,
  frontierId,
  onOpenStage,
}: {
  world: CampaignWorld;
  startIndex: number;
  width: number;
  progress: CampaignProgress;
  frontierId?: string;
  onOpenStage: (stage: CampaignStage) => void;
}) {
  const centres = world.stages.map((_, i) => ({
    x: trailX(startIndex + i, width),
    y: i * STEP_Y + STEP_Y / 2,
  }));

  return (
    <View style={{ height: world.stages.length * STEP_Y + 14 }}>
      {centres.slice(0, -1).map((from, i) => (
        <TrailDots key={i} from={from} to={centres[i + 1]!} colour={world.colour} />
      ))}
      {world.stages.map((stage, i) => (
        <StageNode
          key={stage.id}
          stage={stage}
          colour={world.colour}
          unlocked={isStageUnlocked(stage.id, progress)}
          frontier={stage.id === frontierId}
          stars={progress[stage.id]?.stars ?? 0}
          x={centres[i]!.x}
          y={centres[i]!.y}
          onPress={() => onOpenStage(stage)}
        />
      ))}
    </View>
  );
}

/**
 * The parchment artwork tiled down the whole scroll length, washed with the
 * theme background so medallions and plaques stay readable in either theme.
 */
function MapBackdrop({ contentHeight, width }: { contentHeight: number; width: number }) {
  const tileHeight = width * MAP_TILE_RATIO;
  const tiles = Math.max(1, Math.ceil(contentHeight / tileHeight));
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: contentHeight }}
      className="overflow-hidden"
    >
      {Array.from({ length: tiles }, (_, i) => (
        <Image
          key={i}
          source={MAP_BG}
          resizeMode="cover"
          // Alternate tiles are flipped vertically so each seam meets its own
          // mirror image instead of jumping between the artwork's two ends.
          style={{
            position: 'absolute',
            top: i * tileHeight,
            width,
            height: tileHeight,
            transform: [{ scaleY: i % 2 === 0 ? 1 : -1 }],
          }}
        />
      ))}
      <View className="absolute inset-0 bg-bg-base/60" />
    </View>
  );
}

/** The campaign map: a winding trail of era worlds, gated by star progress. */
export function CampaignMapScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isReady, campaign } = useSaves();
  const [progress, setProgress] = useState<CampaignProgress>({});
  const [contentHeight, setContentHeight] = useState(0);

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
  /** Global play-order position of each stage, for a continuous trail phase. */
  const orderOf = new Map(stages.map((s, i) => [s.id, i]));

  const openStage = useCallback(
    (worldId: string, stage: CampaignStage) => {
      router.push({
        pathname: '/campaign/[world]/[stage]',
        params: { world: worldId, stage: stage.id },
      });
    },
    [router],
  );

  return (
    <Screen>
      <ScrollView contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={FadeIn.duration(300)}
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        >
          {contentHeight > 0 && <MapBackdrop contentHeight={contentHeight} width={width} />}

          <View className="px-5 pt-2">
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
          </View>

          {CAMPAIGN.map((world) => {
            const earned = world.stages.reduce(
              (n, s) => n + (progress[s.id]?.stars ?? 0),
              0,
            );
            const startIndex = orderOf.get(world.stages[0]?.id ?? '') ?? 0;
            return (
              <View key={world.id}>
                <EraBanner world={world} earned={earned} total={world.stages.length * 3} />
                <EraTrail
                  world={world}
                  startIndex={startIndex}
                  width={width}
                  progress={progress}
                  frontierId={frontierId}
                  onOpenStage={(stage) => openStage(world.id, stage)}
                />
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

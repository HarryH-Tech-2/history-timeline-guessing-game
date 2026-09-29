import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { usePremium } from '@/features/premium';
import { useSaves } from '@/features/save';
import { useThemeColors } from '@/theme';

import type { CampaignProgress } from '../persistence';
import {
  allStages,
  CAMPAIGN,
  eraStatus,
  isStagePremium,
  isStageUnlocked,
  isWorldPremium,
  progressSince,
  type CampaignStage,
  type CampaignWorld,
  type EraStatus,
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
/** Delay between trail dots lighting up in the unlock sequence. */
const DOT_STAGGER_MS = 90;
/** When the light-up sequence starts after the map regains focus. */
const SEQUENCE_DELAY_MS = 250;

const MAP_BG = require('../../../../assets/campaign-map-bg.webp');
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

/** Stages that just changed since the last visit, and a token to replay the sequence. */
interface Celebration {
  token: number;
  cleared: ReadonlySet<string>;
  unlocked: ReadonlySet<string>;
}

const NO_CELEBRATION: Celebration = { token: 0, cleared: new Set(), unlocked: new Set() };

/** A copper light bar that sweeps across a plaque once, when its era opens. */
function Shimmer({ token }: { token: number }) {
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(-1);

  useEffect(() => {
    if (reducedMotion) return;
    x.value = -1;
    x.value = withDelay(
      SEQUENCE_DELAY_MS + 500,
      withTiming(2, { duration: 900, easing: Easing.inOut(Easing.quad) }),
    );
    return () => cancelAnimation(x);
  }, [token, reducedMotion, x]);

  const style = useAnimatedStyle(() => ({
    opacity: x.value > -1 && x.value < 2 ? 0.35 : 0,
    left: `${x.value * 100}%`,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        { position: 'absolute', top: 0, bottom: 0, width: '30%', backgroundColor: '#F5B266' },
      ]}
    />
  );
}

/**
 * Museum plaque introducing an era: numeral, year span, name, star tally, a
 * bar of stages cleared, and a seal once the era is complete or mastered.
 */
function EraBanner({
  world,
  status,
  earned,
  total,
  premiumLocked,
  shimmerToken,
}: {
  world: CampaignWorld;
  status: EraStatus;
  earned: number;
  total: number;
  /** Premium era and the player isn't: a crown badge instead of progress seals. */
  premiumLocked: boolean;
  /** Set when the era just opened; replays the shimmer. */
  shimmerToken?: number;
}) {
  const colors = useThemeColors();
  const fraction = status.total > 0 ? status.cleared / status.total : 0;
  const seal = premiumLocked
    ? { text: '👑 Premium', testID: 'era-premium' }
    : status.mastered
      ? { text: '🏆 Mastered', testID: 'era-mastered' }
      : status.complete
        ? { text: '✓ Era complete', testID: 'era-complete' }
        : null;

  return (
    <View className="px-5 pb-1 pt-6" testID={`world-${world.id}`}>
      <View
        className="overflow-hidden border px-4 py-3"
        style={{
          borderColor: status.complete ? world.colour : colors.hair,
          borderLeftWidth: 4,
          borderLeftColor: world.colour,
          backgroundColor: status.complete ? `${world.colour}22` : colors.bg.raised,
        }}
      >
        {shimmerToken !== undefined && <Shimmer token={shimmerToken} />}
        <View className="flex-row items-center justify-between">
          <Text
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: world.colour }}
          >
            Era {ROMAN[world.index - 1] ?? world.index} · {world.period}
          </Text>
          {seal !== null && (
            <View
              className="px-1.5 py-0.5"
              style={{ backgroundColor: premiumLocked ? colors.bg.overlay : world.colour }}
              testID={seal.testID}
            >
              <Text
                className="text-[10px] font-extrabold uppercase tracking-wide"
                style={{ color: premiumLocked ? colors.ink.primary : INK_ON_COLOUR }}
              >
                {seal.text}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-end justify-between">
          <Text className="text-xl font-extrabold text-ink-primary">{world.name}</Text>
          <Text className="text-xs font-semibold text-ink-muted">
            ★ {earned} / {total}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center gap-2">
          <View
            className="h-1.5 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: colors.hair }}
          >
            <View
              className="h-1.5 rounded-full"
              style={{ width: `${fraction * 100}%`, backgroundColor: world.colour }}
              testID={`era-progress-${world.id}`}
            />
          </View>
          <Text className="text-[11px] font-semibold text-ink-muted">
            {status.cleared}/{status.total} stages
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * A stage medallion pinned to the map, with its star tally beneath. When it
 * was cleared since the last visit it pops and its stars drop in; when it was
 * just unlocked it brightens a beat later, as the trail reaches it.
 */
function StageNode({
  stage,
  colour,
  unlocked,
  frontier,
  premiumLocked,
  stars,
  x,
  y,
  celebrate,
  onPress,
}: {
  stage: CampaignStage;
  colour: string;
  unlocked: boolean;
  /** The next stage to play: pulsing ring and a Play chip. */
  frontier: boolean;
  /** Premium stage for a free player: a crown, and tapping opens the paywall. */
  premiumLocked: boolean;
  stars: number;
  /** Centre of the medallion, in the era panel's coordinates. */
  x: number;
  y: number;
  celebrate: { token: number; kind: 'cleared' | 'unlocked' } | null;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const done = stars > 0;
  const scale = useSharedValue(1);
  const starsIn = useSharedValue(1);

  const token = celebrate?.token;
  const kind = celebrate?.kind;
  useEffect(() => {
    if (token === undefined || reducedMotion) return;
    // A cleared stage pops as the sequence starts; an unlocked one waits for
    // the trail's lights to reach it.
    const delay =
      kind === 'cleared'
        ? SEQUENCE_DELAY_MS
        : SEQUENCE_DELAY_MS + 200 + TRAIL_DOTS * DOT_STAGGER_MS;
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(kind === 'cleared' ? 1.25 : 1.15, { duration: 160 }),
        withSpring(1, { damping: 8, stiffness: 180 }),
      ),
    );
    if (kind === 'cleared') {
      starsIn.value = 0;
      starsIn.value = withDelay(delay + 200, withTiming(1, { duration: 350 }));
    }
    return () => {
      cancelAnimation(scale);
      cancelAnimation(starsIn);
    };
  }, [token, kind, reducedMotion, scale, starsIn]);

  const medallionStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const starsStyle = useAnimatedStyle(() => ({
    opacity: starsIn.value,
    transform: [{ translateY: (1 - starsIn.value) * -8 }],
  }));

  const playable = unlocked || premiumLocked;
  const glyph = premiumLocked ? '👑' : unlocked ? (stars === 3 ? '★' : stage.index) : '🔒';
  const label = `Stage ${stage.index}${premiumLocked ? ', Premium' : unlocked ? '' : ', locked'}`;

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
      <Animated.View style={medallionStyle}>
        <Pressable
          disabled={!playable}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
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
            opacity: unlocked ? 1 : premiumLocked ? 0.8 : 0.55,
            // A soft ground shadow so medallions sit "on" the parchment; cleared
            // ones glow in their era colour instead.
            elevation: unlocked ? 4 : 0,
            shadowColor: done ? colour : '#000',
            shadowOpacity: done ? 0.7 : 0.3,
            shadowRadius: done ? 8 : 4,
            shadowOffset: { width: 0, height: done ? 0 : 2 },
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
            {glyph}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Star tally (or Play prompt) on a small plate under the medallion. */}
      {frontier ? (
        <View className="mt-1 px-2 py-0.5" style={{ backgroundColor: colour }}>
          <Text
            className="text-[10px] font-extrabold uppercase tracking-wide"
            style={{ color: INK_ON_COLOUR, includeFontPadding: false }}
          >
            {premiumLocked ? '👑 Unlock' : 'Play'}
          </Text>
        </View>
      ) : (
        unlocked && (
          <Animated.View style={starsStyle} className="mt-1 bg-bg-raised/90 px-1.5 py-0.5">
            <Text className="text-[11px]" style={{ color: done ? colour : colors.hair }}>
              {'★'.repeat(stars)}
              <Text style={{ color: colors.hair }}>{'☆'.repeat(3 - stars)}</Text>
            </Text>
          </Animated.View>
        )
      )}
    </View>
  );
}

/** One trail dot; `lightDelay` fades its lit colour in as part of the unlock sequence. */
function TrailDot({
  left,
  top,
  colour,
  lit,
  lightDelay,
  token,
}: {
  left: number;
  top: number;
  colour: string;
  lit: boolean;
  lightDelay: number | null;
  token: number;
}) {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const glow = useSharedValue(1);

  useEffect(() => {
    if (lightDelay === null || reducedMotion) return;
    glow.value = 0;
    glow.value = withDelay(lightDelay, withTiming(1, { duration: 220 }));
    return () => cancelAnimation(glow);
  }, [lightDelay, token, reducedMotion, glow]);

  const litStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: left - 6.5, top: top - 6.5 }}>
      {/* The unlit dot sits underneath, so a lit one fades in over it. */}
      <View
        style={{
          position: 'absolute',
          left: 4,
          top: 4,
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: colors.ink.muted,
          opacity: 0.45,
        }}
      />
      {lit && (
        <Animated.View style={litStyle} testID="trail-dot-lit">
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 6.5,
              backgroundColor: colour,
              opacity: 0.25,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 3,
              top: 3,
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: colour,
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Dotted trail segment between two medallion centres. Lit in the era colour
 * once the stage it leaves from is cleared — the road behind the player glows,
 * the road ahead stays faint.
 */
function TrailDots({
  from,
  to,
  colour,
  lit,
  lighting,
  token,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  colour: string;
  lit: boolean;
  /** This segment was lit since the last visit: light it dot by dot. */
  lighting: boolean;
  token: number;
}) {
  return (
    <>
      {Array.from({ length: TRAIL_DOTS }, (_, i) => {
        const t = (i + 1) / (TRAIL_DOTS + 1);
        return (
          <TrailDot
            key={i}
            left={from.x + (to.x - from.x) * t}
            top={from.y + (to.y - from.y) * t}
            colour={colour}
            lit={lit}
            lightDelay={lighting ? SEQUENCE_DELAY_MS + 200 + i * DOT_STAGGER_MS : null}
            token={token}
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
  premiumLocked,
  celebration,
  onOpenStage,
  onLayoutY,
}: {
  world: CampaignWorld;
  startIndex: number;
  width: number;
  progress: CampaignProgress;
  frontierId?: string;
  premiumLocked: boolean;
  celebration: Celebration;
  onOpenStage: (stage: CampaignStage) => void;
  onLayoutY: (y: number) => void;
}) {
  const centres = world.stages.map((_, i) => ({
    x: trailX(startIndex + i, width),
    y: i * STEP_Y + STEP_Y / 2,
  }));

  return (
    <View
      style={{ height: world.stages.length * STEP_Y + 14 }}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
    >
      {centres.slice(0, -1).map((from, i) => {
        const fromStage = world.stages[i]!;
        return (
          <TrailDots
            key={i}
            from={from}
            to={centres[i + 1]!}
            colour={world.colour}
            lit={(progress[fromStage.id]?.stars ?? 0) >= 1}
            lighting={celebration.cleared.has(fromStage.id)}
            token={celebration.token}
          />
        );
      })}
      {world.stages.map((stage, i) => {
        const kind = celebration.cleared.has(stage.id)
          ? 'cleared'
          : celebration.unlocked.has(stage.id)
            ? 'unlocked'
            : null;
        return (
          <StageNode
            key={stage.id}
            stage={stage}
            colour={world.colour}
            unlocked={isStageUnlocked(stage.id, progress)}
            frontier={stage.id === frontierId}
            premiumLocked={premiumLocked}
            stars={progress[stage.id]?.stars ?? 0}
            x={centres[i]!.x}
            y={centres[i]!.y}
            celebrate={kind === null ? null : { token: celebration.token, kind }}
            onPress={() => onOpenStage(stage)}
          />
        );
      })}
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

/** The next stage to play: the first unlocked one without a star. */
function frontierOf(progress: CampaignProgress): CampaignStage | undefined {
  return allStages().find(
    (s) => isStageUnlocked(s.id, progress) && (progress[s.id]?.stars ?? 0) === 0,
  );
}

/**
 * The campaign map (the Campaign tab): a winding trail of era worlds, gated by
 * star progress. Whatever changed since the last visit — stages cleared, new
 * ones unlocked — lights up in sequence, then the map follows the trail to the
 * new frontier.
 */
export function CampaignMapScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { isReady, campaign } = useSaves();
  const { isPremium } = usePremium();
  const [progress, setProgress] = useState<CampaignProgress>({});
  const [contentHeight, setContentHeight] = useState(0);
  const [celebration, setCelebration] = useState<Celebration>(NO_CELEBRATION);

  const scrollRef = useRef<ScrollView>(null);
  /** Progress as of the last visit, per save store — what "new" is measured against. */
  const seen = useRef<{ store: unknown; progress: CampaignProgress } | null>(null);
  /** Where each era's wrapper and trail sit, for scrolling to a stage. */
  const eraY = useRef(new Map<string, number>());
  const trailY = useRef(new Map<string, number>());
  const pendingScroll = useRef<{ stageId: string; animated: boolean } | null>(null);

  const stages = allStages();
  const frontierId = frontierOf(progress)?.id;
  const totalStars = stages.reduce((n, s) => n + (progress[s.id]?.stars ?? 0), 0);
  const clearedStages = stages.filter((s) => (progress[s.id]?.stars ?? 0) >= 1).length;
  const journey = stages.length > 0 ? clearedStages / stages.length : 0;
  /** Global play-order position of each stage, for a continuous trail phase. */
  const orderOf = new Map(stages.map((s, i) => [s.id, i]));

  /** Scroll so a pending stage sits a third of the way down, once its era is laid out. */
  const tryScroll = useCallback(() => {
    const target = pendingScroll.current;
    if (target === null) return;
    const stage = allStages().find((s) => s.id === target.stageId);
    if (!stage) return;
    const wrapper = eraY.current.get(stage.worldId);
    const trail = trailY.current.get(stage.worldId);
    if (wrapper === undefined || trail === undefined) return;
    pendingScroll.current = null;
    const y = wrapper + trail + (stage.index - 1) * STEP_Y + STEP_Y / 2;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - height / 3), animated: target.animated });
  }, [height]);

  useFocusEffect(
    useCallback(() => {
      if (!isReady) return;
      let active = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      void campaign.read().then((p) => {
        if (!active) return;
        const previous = seen.current?.store === campaign ? seen.current.progress : null;
        seen.current = { store: campaign, progress: p };
        setProgress(p);
        const next = frontierOf(p);
        if (previous === null) {
          // First visit: open on the stage to play, without fanfare.
          if (next) pendingScroll.current = { stageId: next.id, animated: false };
          tryScroll();
          return;
        }
        const delta = progressSince(previous, p);
        if (delta.cleared.length === 0 && delta.unlocked.length === 0) return;
        setCelebration((c) => ({
          token: c.token + 1,
          cleared: new Set(delta.cleared),
          unlocked: new Set(delta.unlocked),
        }));
        // Follow the trail to the new frontier as the lights run along it.
        timer = setTimeout(() => {
          if (next) pendingScroll.current = { stageId: next.id, animated: true };
          tryScroll();
        }, SEQUENCE_DELAY_MS + 300);
      });
      return () => {
        active = false;
        if (timer !== undefined) clearTimeout(timer);
      };
    }, [isReady, campaign, tryScroll]),
  );

  const openStage = useCallback(
    (worldId: string, stage: CampaignStage) => {
      if (isStagePremium(stage) && !isPremium) {
        router.push('/paywall');
        return;
      }
      router.push({
        pathname: '/campaign/[world]/[stage]',
        params: { world: worldId, stage: stage.id },
      });
    },
    [router, isPremium],
  );

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeIn.duration(300)}
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        >
          {contentHeight > 0 && <MapBackdrop contentHeight={contentHeight} width={width} />}

          <View className="px-5 pt-2">
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-2xl font-extrabold text-ink-primary">Campaign</Text>
              <Text className="text-sm font-semibold text-ink-muted">
                ★ {totalStars} / {stages.length * 3}
              </Text>
            </View>
            <Text className="mt-1 text-sm text-ink-secondary">
              March through five eras of history. Earn a star to open the next stage.
            </Text>
            <View className="mt-3 flex-row items-center gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Journey
              </Text>
              <View className="h-2 flex-1 overflow-hidden rounded-full bg-hair">
                <View
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${journey * 100}%` }}
                  testID="journey-bar"
                />
              </View>
              <Text className="text-[11px] font-bold text-ink-primary" testID="journey-percent">
                {Math.round(journey * 100)}%
              </Text>
            </View>
          </View>

          {CAMPAIGN.map((world) => {
            const earned = world.stages.reduce(
              (n, s) => n + (progress[s.id]?.stars ?? 0),
              0,
            );
            const startIndex = orderOf.get(world.stages[0]?.id ?? '') ?? 0;
            const premiumLocked = isWorldPremium(world.id) && !isPremium;
            const firstStage = world.stages[0];
            const opened = firstStage !== undefined && celebration.unlocked.has(firstStage.id);
            return (
              <View
                key={world.id}
                onLayout={(e) => {
                  eraY.current.set(world.id, e.nativeEvent.layout.y);
                  tryScroll();
                }}
              >
                <EraBanner
                  world={world}
                  status={eraStatus(world, progress)}
                  earned={earned}
                  total={world.stages.length * 3}
                  premiumLocked={premiumLocked}
                  shimmerToken={opened ? celebration.token : undefined}
                />
                <EraTrail
                  world={world}
                  startIndex={startIndex}
                  width={width}
                  progress={progress}
                  frontierId={frontierId}
                  premiumLocked={premiumLocked}
                  celebration={celebration}
                  onOpenStage={(stage) => openStage(world.id, stage)}
                  onLayoutY={(y) => {
                    trailY.current.set(world.id, y);
                    tryScroll();
                  }}
                />
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

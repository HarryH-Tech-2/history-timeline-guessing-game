import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePremium } from '@/features/premium';
import { paywallHref } from '@/features/premium/paywallSource';
import { useSaves } from '@/features/save';

import type { CampaignProgress } from '../persistence';
import {
  allStages,
  allStagesIncludingRoutes,
  CAMPAIGN,
  eraStatus,
  frontierStage,
  isStagePremium,
  isWorldPremium,
  progressSince,
  pulseStageIds,
  starsEarned,
  type CampaignStage,
  worldStages,
} from './campaignMap';
import { SEQUENCE_DELAY_MS, STICKY_BAR_SPACE } from './map/constants';
import { EraBackdrop } from './map/EraBackdrop';
import { EraBanner } from './map/EraBanner';
import { EraTrail, NO_CELEBRATION, type Celebration } from './map/EraTrail';
import { bannerTucked, eraInView } from './map/mapVisuals';
import { StickyEraBar } from './map/StickyEraBar';
import { eraTrailLayout, type TrailLayout } from './map/trailLayout';

/**
 * The campaign map: a Duolingo-style trail of round 3D stage buttons winding
 * down over a fixed, full-screen painting of the era in view (cross-fading as
 * the player scrolls between eras). Each era opens with a chunky banner; once
 * it scrolls away a slim sticky bar names the era instead. The pieces live in
 * ./map; this screen composes them and owns scrolling and the since-last-visit
 * light-up sequence.
 */

/** Space under the last era so its final stage sits well clear of the tab bar. */
const BOTTOM_PAD = 64;

/**
 * The campaign map (the Campaign tab): a winding trail of era worlds, gated by
 * star progress. Whatever changed since the last visit — stages cleared, new
 * ones unlocked — lights up in sequence, then the map follows the trail to the
 * new frontier.
 */
export function CampaignMapScreen() {
  const router = useRouter();
  /**
   * `focus`: a stage to open the map on, overriding the frontier scroll —
   * "Continue your quest" after the stage before a fork lands on the fork.
   */
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const focusRef = useRef(focus);
  const { width, height } = useWindowDimensions();
  const { isReady, campaign } = useSaves();
  const { isPremium } = usePremium();
  const [progress, setProgress] = useState<CampaignProgress>({});
  const [celebration, setCelebration] = useState<Celebration>(NO_CELEBRATION);
  /** The era scrolled into view: its painting fills the screen and the sticky bar names it. */
  const [viewEraId, setViewEraId] = useState(CAMPAIGN[0]?.id);
  /** Whether that era's own banner has scrolled up under the sticky bar. */
  const [barVisible, setBarVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  /** Progress as of the last visit, per save store — what "new" is measured against. */
  const seen = useRef<{ store: unknown; progress: CampaignProgress } | null>(null);
  /** Where each era's wrapper and trail sit, for scrolling to a stage. */
  const eraY = useRef(new Map<string, number>());
  const trailY = useRef(new Map<string, number>());
  const pendingScroll = useRef<{ stageId: string; animated: boolean } | null>(null);
  const viewEraRef = useRef(viewEraId);
  const barVisibleRef = useRef(barVisible);
  const scrollY = useRef(0);

  const frontierId = frontierStage(progress)?.id;
  /** Each era's trail geometry; the swing phase runs on along the main path. */
  const layouts = useMemo(() => {
    const orderOf = new Map(allStages().map((s, i) => [s.id, i]));
    return new Map(
      CAMPAIGN.map(
        (w) => [w.id, eraTrailLayout(w, orderOf.get(w.stages[0]?.id ?? '') ?? 0, width)] as const,
      ),
    );
  }, [width]);
  const layoutsRef = useRef<ReadonlyMap<string, TrailLayout>>(layouts);
  // Latest values for the scroll/focus callbacks, without re-running the focus effect.
  useLayoutEffect(() => {
    focusRef.current = focus;
    layoutsRef.current = layouts;
  }, [focus, layouts]);
  const pulseIds = pulseStageIds(progress);

  /**
   * Point the backdrop and sticky bar at whichever era sits under the bar at
   * scroll offset `y`, and show the bar only once that era's banner is tucked
   * up beneath it.
   */
  const trackEra = useCallback((y: number) => {
    scrollY.current = y;
    const probe = y + STICKY_BAR_SPACE;
    const sections = [...eraY.current].map(([id, top]) => ({ id, y: top }));
    const id = eraInView(sections, probe);
    if (id === undefined) return;
    if (id !== viewEraRef.current) {
      viewEraRef.current = id;
      setViewEraId(id);
    }
    // The trail starts where the banner block ends.
    const top = eraY.current.get(id);
    const bannerEnd = trailY.current.get(id);
    const tucked = bannerTucked(
      top !== undefined && bannerEnd !== undefined ? top + bannerEnd : undefined,
      probe,
    );
    if (tucked !== barVisibleRef.current) {
      barVisibleRef.current = tucked;
      setBarVisible(tucked);
    }
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => trackEra(e.nativeEvent.contentOffset.y),
    [trackEra],
  );

  /** Scroll so a pending stage sits a third of the way down, once its era is laid out. */
  const tryScroll = useCallback(() => {
    const target = pendingScroll.current;
    if (target === null) return;
    const stage = allStagesIncludingRoutes().find((s) => s.id === target.stageId);
    if (!stage) return;
    const wrapper = eraY.current.get(stage.worldId);
    const trail = trailY.current.get(stage.worldId);
    const node = layoutsRef.current.get(stage.worldId)?.nodes.find((n) => n.stage.id === stage.id);
    if (wrapper === undefined || trail === undefined || node === undefined) return;
    pendingScroll.current = null;
    const y = wrapper + trail + node.y;
    const offset = Math.max(0, y - height / 3);
    scrollRef.current?.scrollTo({ y: offset, animated: target.animated });
    // A programmatic jump doesn't always report a scroll event; keep the bar honest.
    trackEra(offset);
  }, [height, trackEra]);

  /** Record where an era section (or its trail) sits, then settle scroll and bar. */
  const measured = useCallback(() => {
    tryScroll();
    trackEra(scrollY.current);
  }, [tryScroll, trackEra]);

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
        // A requested focus (the fork, after "Continue your quest") wins over
        // the frontier; consume it so a later visit to the tab doesn't jump back.
        const focusId = focusRef.current;
        if (focusId !== undefined) router.setParams({ focus: undefined });
        const targetId = focusId ?? frontierStage(p)?.id;
        if (previous === null) {
          // First visit: open on the stage to play, without fanfare.
          if (targetId !== undefined) pendingScroll.current = { stageId: targetId, animated: false };
          tryScroll();
          return;
        }
        const delta = progressSince(previous, p);
        if (delta.cleared.length === 0 && delta.unlocked.length === 0) {
          if (focusId !== undefined) {
            pendingScroll.current = { stageId: focusId, animated: true };
            tryScroll();
          }
          return;
        }
        setCelebration((c) => ({
          token: c.token + 1,
          cleared: new Set(delta.cleared),
          unlocked: new Set(delta.unlocked),
        }));
        // Follow the trail to the new frontier as the lights run along it.
        timer = setTimeout(() => {
          if (targetId !== undefined) pendingScroll.current = { stageId: targetId, animated: true };
          tryScroll();
        }, SEQUENCE_DELAY_MS + 300);
      });
      return () => {
        active = false;
        if (timer !== undefined) clearTimeout(timer);
      };
    }, [isReady, campaign, tryScroll, router]),
  );

  const openStage = useCallback(
    (worldId: string, stage: CampaignStage) => {
      if (isStagePremium(stage) && !isPremium) {
        router.push(paywallHref('campaign'));
        return;
      }
      router.push({
        pathname: '/campaign/[world]/[stage]',
        params: { world: worldId, stage: stage.id },
      });
    },
    [router, isPremium],
  );

  const viewWorld = CAMPAIGN.find((w) => w.id === viewEraId) ?? CAMPAIGN[0];

  return (
    // Not <Screen>: the painting must run under the status bar and right down
    // to the tab bar, so only the content honours the safe area.
    <View className="flex-1 bg-bg-base">
      {viewEraId !== undefined && <EraBackdrop eraId={viewEraId} />}
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1">
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
        >
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{
              paddingTop: STICKY_BAR_SPACE - 24,
              paddingBottom: BOTTOM_PAD,
            }}
          >
            {CAMPAIGN.map((world) => {
              const premiumLocked = isWorldPremium(world.id) && !isPremium;
              const firstStage = world.stages[0];
              const opened = firstStage !== undefined && celebration.unlocked.has(firstStage.id);
              return (
                <View
                  key={world.id}
                  testID={`era-section-${world.id}`}
                  onLayout={(e) => {
                    eraY.current.set(world.id, e.nativeEvent.layout.y);
                    measured();
                  }}
                >
                  <EraBanner
                    world={world}
                    status={eraStatus(world, progress)}
                    earned={starsEarned(worldStages(world), progress)}
                    total={worldStages(world).length * 3}
                    premiumLocked={premiumLocked}
                    shimmerToken={opened ? celebration.token : undefined}
                  />
                  <EraTrail
                    world={world}
                    layout={layouts.get(world.id)!}
                    width={width}
                    progress={progress}
                    frontierId={frontierId}
                    pulseIds={pulseIds}
                    premiumLocked={premiumLocked}
                    celebration={celebration}
                    onOpenStage={(stage) => openStage(world.id, stage)}
                    onLayoutY={(y) => {
                      trailY.current.set(world.id, y);
                      measured();
                    }}
                  />
                </View>
              );
            })}
          </Animated.View>
        </ScrollView>

        {viewWorld !== undefined && (
          <StickyEraBar
            world={viewWorld}
            earned={starsEarned(worldStages(viewWorld), progress)}
            total={worldStages(viewWorld).length * 3}
            journeyEarned={starsEarned(allStagesIncludingRoutes(), progress)}
            journeyTotal={allStagesIncludingRoutes().length * 3}
            visible={barVisible}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

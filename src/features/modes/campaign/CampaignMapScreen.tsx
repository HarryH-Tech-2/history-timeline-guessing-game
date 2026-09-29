import { useCallback, useRef, useState } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { usePremium } from '@/features/premium';
import { paywallHref } from '@/features/premium/paywallSource';
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
} from './campaignMap';
import { SEQUENCE_DELAY_MS, STEP_Y, STICKY_BAR_SPACE } from './map/constants';
import { EraBackdrop, type BackdropSection } from './map/EraBackdrop';
import { EraBanner } from './map/EraBanner';
import { EraTrail, NO_CELEBRATION, type Celebration } from './map/EraTrail';
import { eraInView } from './map/mapVisuals';
import { StickyEraBar } from './map/StickyEraBar';

/**
 * The campaign map: a Duolingo-style trail of round 3D stage buttons winding
 * down through a painted scene per era. Each era opens with a chunky banner;
 * a slim sticky bar names the era currently in view. The pieces live in
 * ./map; this screen composes them and owns scrolling and the since-last-visit
 * light-up sequence.
 */

/** Space under the last era so its final stage clears the tab bar. */
const BOTTOM_PAD = 40;

function starsIn(stages: readonly CampaignStage[], progress: CampaignProgress): number {
  return stages.reduce((n, s) => n + (progress[s.id]?.stars ?? 0), 0);
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
  const colors = useThemeColors();
  const { width, height } = useWindowDimensions();
  const { isReady, campaign } = useSaves();
  const { isPremium } = usePremium();
  const [progress, setProgress] = useState<CampaignProgress>({});
  const [contentHeight, setContentHeight] = useState(0);
  const [celebration, setCelebration] = useState<Celebration>(NO_CELEBRATION);
  /** Each era section's measured box, for painting its backdrop. */
  const [sectionBoxes, setSectionBoxes] = useState<Record<string, { y: number; height: number }>>(
    {},
  );
  /** The era scrolled into view, named in the sticky bar. */
  const [viewEraId, setViewEraId] = useState(CAMPAIGN[0]?.id);

  const scrollRef = useRef<ScrollView>(null);
  /** Progress as of the last visit, per save store — what "new" is measured against. */
  const seen = useRef<{ store: unknown; progress: CampaignProgress } | null>(null);
  /** Where each era's wrapper and trail sit, for scrolling to a stage. */
  const eraY = useRef(new Map<string, number>());
  const trailY = useRef(new Map<string, number>());
  const pendingScroll = useRef<{ stageId: string; animated: boolean } | null>(null);
  const viewEraRef = useRef(viewEraId);

  const stages = allStages();
  const frontierId = frontierOf(progress)?.id;
  /** Global play-order position of each stage, for a continuous trail phase. */
  const orderOf = new Map(stages.map((s, i) => [s.id, i]));

  /** Point the sticky bar at whichever era sits under it at scroll offset `y`. */
  const trackEra = useCallback((y: number) => {
    const sections = [...eraY.current].map(([id, top]) => ({ id, y: top }));
    const id = eraInView(sections, y + STICKY_BAR_SPACE);
    if (id !== undefined && id !== viewEraRef.current) {
      viewEraRef.current = id;
      setViewEraId(id);
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
    const stage = allStages().find((s) => s.id === target.stageId);
    if (!stage) return;
    const wrapper = eraY.current.get(stage.worldId);
    const trail = trailY.current.get(stage.worldId);
    if (wrapper === undefined || trail === undefined) return;
    pendingScroll.current = null;
    const y = wrapper + trail + (stage.index - 1) * STEP_Y + STEP_Y / 2;
    const offset = Math.max(0, y - height / 3);
    scrollRef.current?.scrollTo({ y: offset, animated: target.animated });
    // A programmatic jump doesn't always report a scroll event; keep the bar honest.
    trackEra(offset);
  }, [height, trackEra]);

  const measureSection = useCallback(
    (worldId: string, y: number, sectionHeight: number) => {
      eraY.current.set(worldId, y);
      setSectionBoxes((boxes) => {
        const box = boxes[worldId];
        if (box?.y === y && box.height === sectionHeight) return boxes;
        return { ...boxes, [worldId]: { y, height: sectionHeight } };
      });
      tryScroll();
    },
    [tryScroll],
  );

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

  // Paint each era from its section's top (the first from the very top) down
  // to where the next begins; the last runs on to the end of the content.
  const measured = CAMPAIGN.filter((w) => sectionBoxes[w.id] !== undefined);
  const backdrop: BackdropSection[] = measured.map((world, i) => {
    const box = sectionBoxes[world.id]!;
    const next = measured[i + 1];
    const top = i === 0 ? 0 : box.y;
    const end =
      next !== undefined
        ? sectionBoxes[next.id]!.y
        : Math.max(box.y + box.height, contentHeight);
    return { id: world.id, top, height: end - top };
  });

  const viewWorld = CAMPAIGN.find((w) => w.id === viewEraId) ?? CAMPAIGN[0];

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{ paddingTop: STICKY_BAR_SPACE - 24, paddingBottom: BOTTOM_PAD }}
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        >
          {backdrop.length > 0 && <EraBackdrop sections={backdrop} wash={colors.bg.base} />}

          {CAMPAIGN.map((world) => {
            const startIndex = orderOf.get(world.stages[0]?.id ?? '') ?? 0;
            const premiumLocked = isWorldPremium(world.id) && !isPremium;
            const firstStage = world.stages[0];
            const opened = firstStage !== undefined && celebration.unlocked.has(firstStage.id);
            return (
              <View
                key={world.id}
                onLayout={(e) =>
                  measureSection(world.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height)
                }
              >
                <EraBanner
                  world={world}
                  status={eraStatus(world, progress)}
                  earned={starsIn(world.stages, progress)}
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

      {viewWorld !== undefined && (
        <StickyEraBar
          world={viewWorld}
          earned={starsIn(viewWorld.stages, progress)}
          total={viewWorld.stages.length * 3}
          journeyEarned={starsIn(stages, progress)}
          journeyTotal={stages.length * 3}
        />
      )}
    </Screen>
  );
}

import { memo } from 'react';
import { View } from 'react-native';

import { routeName } from '@/data';

import type { CampaignStage, CampaignWorld } from '../campaignMap';
import { EraReward, type RewardState } from './EraReward';
import { stageIcon } from './mapVisuals';
import { RouteBanner } from './RouteBanner';
import { StageButton } from './StageButton';
import type { TrailLayout } from './trailLayout';
import { TrailDots } from './TrailDots';

/** Stages that just changed since the last visit, and a token to replay the sequence. */
export interface Celebration {
  token: number;
  cleared: ReadonlySet<string>;
  unlocked: ReadonlySet<string>;
}

export const NO_CELEBRATION: Celebration = { token: 0, cleared: new Set(), unlocked: new Set() };

/** Where the era's closing trophy stands, and whether it was won since the last visit. */
export interface EraRewardStanding {
  state: RewardState;
  /** Main stages cleared (eras complete, for the campaign's final trophy). */
  progress: { done: number; total: number };
  /** Won since the last visit: play the fanfare. */
  justWon: boolean;
}

/** A stage's standing on the map, worked out once per progress change. */
export interface StageStanding {
  unlocked: boolean;
  stars: number;
}

/**
 * One era's stretch of the trail, drawn from its precomputed layout: the
 * solid road, the fork's route banners, the stage buttons on top, and the
 * era's trophy at the end. Memoised:
 * scrolling re-renders the screen, but a trail only redraws when its own
 * inputs change.
 */
export const EraTrail = memo(function EraTrail({
  world,
  layout,
  width,
  standings,
  frontierId,
  pulseIds,
  hideOwl,
  premiumLocked,
  celebration,
  reward,
  onOpenStage,
  onLayoutY,
}: {
  world: CampaignWorld;
  layout: TrailLayout;
  width: number;
  /** Every stage's unlocked state and stars, keyed by stage id. */
  standings: ReadonlyMap<string, StageStanding>;
  frontierId?: string;
  /** Stages wearing the frontier pulse (both route openers at a fresh fork). */
  pulseIds: ReadonlySet<string>;
  /** Leave Minerva off the frontier (a fresh fork, both openers pulsing). */
  hideOwl: boolean;
  premiumLocked: boolean;
  celebration: Celebration;
  reward: EraRewardStanding;
  onOpenStage: (worldId: string, stage: CampaignStage) => void;
  onLayoutY: (worldId: string, y: number) => void;
}) {
  const starsOf = (stageId: string) => standings.get(stageId)?.stars ?? 0;
  return (
    <View
      testID={`era-trail-${world.id}`}
      style={{ height: layout.height }}
      onLayout={(e) => onLayoutY(world.id, e.nativeEvent.layout.y)}>
      {layout.segments.map((segment) => {
        const { lit, lighting } =
          segment.kind === 'lead'
            ? {
                lit: standings.get(segment.toId)?.unlocked ?? false,
                lighting: celebration.unlocked.has(segment.toId),
              }
            : segment.kind === 'tail'
              ? { lit: reward.state !== 'locked', lighting: reward.justWon }
              : {
                  lit: starsOf(segment.fromId) >= 1,
                  lighting: celebration.cleared.has(segment.fromId),
                };
        return (
          <TrailDots
            key={segment.key}
            dots={segment.dots}
            colour={world.colour}
            lit={lit}
            lighting={lighting}
            token={celebration.token}
            beckon={pulseIds.has(segment.toId)}
          />
        );
      })}
      <EraReward
        world={world}
        spot={layout.reward}
        state={reward.state}
        progress={reward.progress}
        trailWidth={width}
        celebrateToken={reward.justWon ? celebration.token : undefined}
      />
      {layout.banners.map((banner) => (
        <RouteBanner
          key={banner.route.id}
          route={banner.route}
          colour={world.colour}
          earned={banner.route.stages.reduce((n, s) => n + starsOf(s.id), 0)}
          total={banner.route.stages.length * 3}
          cleared={banner.route.stages.every((s) => starsOf(s.id) >= 1)}
          locked={!(standings.get(banner.route.stages[0]?.id ?? '')?.unlocked ?? false)}
          left={banner.left}
          top={banner.top}
          width={banner.width}
        />
      ))}
      {layout.nodes.map(({ stage, route, x, y }) => {
        const kind = celebration.cleared.has(stage.id)
          ? 'cleared'
          : celebration.unlocked.has(stage.id)
            ? 'unlocked'
            : null;
        return (
          <StageButton
            key={stage.id}
            stage={stage}
            icon={stageIcon(stage, world).icon}
            routeName={route === undefined ? undefined : routeName(route)}
            colour={world.colour}
            unlocked={standings.get(stage.id)?.unlocked ?? false}
            frontier={stage.id === frontierId}
            pulse={pulseIds.has(stage.id)}
            premiumLocked={premiumLocked}
            stars={starsOf(stage.id)}
            x={x}
            y={y}
            owlSide={x > width / 2 ? 'left' : 'right'}
            hideOwl={hideOwl}
            celebrate={kind === null ? null : { token: celebration.token, kind }}
            onPress={() => onOpenStage(world.id, stage)}
          />
        );
      })}
    </View>
  );
});

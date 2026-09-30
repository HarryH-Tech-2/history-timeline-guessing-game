import { View } from 'react-native';

import type { CampaignProgress } from '../../persistence';
import {
  isStageUnlocked,
  starsEarned,
  type CampaignStage,
  type CampaignWorld,
} from '../campaignMap';
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

/**
 * One era's stretch of the trail, drawn from its precomputed layout: dotted
 * segments, the fork's route banners, then the stage buttons on top.
 */
export function EraTrail({
  world,
  layout,
  width,
  progress,
  frontierId,
  pulseIds,
  premiumLocked,
  celebration,
  onOpenStage,
  onLayoutY,
}: {
  world: CampaignWorld;
  layout: TrailLayout;
  width: number;
  progress: CampaignProgress;
  frontierId?: string;
  /** Stages wearing the frontier pulse (both route openers at a fresh fork). */
  pulseIds: ReadonlySet<string>;
  premiumLocked: boolean;
  celebration: Celebration;
  onOpenStage: (stage: CampaignStage) => void;
  onLayoutY: (y: number) => void;
}) {
  return (
    <View
      testID={`era-trail-${world.id}`}
      style={{ height: layout.height }}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}>
      {layout.segments.map((segment) => (
        <TrailDots
          key={`${segment.fromId}>${segment.toId}`}
          from={segment.from}
          to={segment.to}
          colour={world.colour}
          lit={(progress[segment.fromId]?.stars ?? 0) >= 1}
          lighting={celebration.cleared.has(segment.fromId)}
          token={celebration.token}
        />
      ))}
      {layout.banners.map((banner) => (
        <RouteBanner
          key={banner.route.id}
          route={banner.route}
          colour={world.colour}
          earned={starsEarned(banner.route.stages, progress)}
          total={banner.route.stages.length * 3}
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
            routeName={route?.name}
            colour={world.colour}
            unlocked={isStageUnlocked(stage.id, progress)}
            frontier={stage.id === frontierId}
            pulse={pulseIds.has(stage.id)}
            premiumLocked={premiumLocked}
            stars={progress[stage.id]?.stars ?? 0}
            x={x}
            y={y}
            owlSide={x > width / 2 ? 'left' : 'right'}
            celebrate={kind === null ? null : { token: celebration.token, kind }}
            onPress={() => onOpenStage(stage)}
          />
        );
      })}
    </View>
  );
}

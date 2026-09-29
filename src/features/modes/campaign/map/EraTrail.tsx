import { View } from 'react-native';

import type { CampaignProgress } from '../../persistence';
import { isStageUnlocked, type CampaignStage, type CampaignWorld } from '../campaignMap';
import { STEP_Y, trailX } from './constants';
import { StageButton } from './StageButton';
import { TrailDots } from './TrailDots';

/** Stages that just changed since the last visit, and a token to replay the sequence. */
export interface Celebration {
  token: number;
  cleared: ReadonlySet<string>;
  unlocked: ReadonlySet<string>;
}

export const NO_CELEBRATION: Celebration = { token: 0, cleared: new Set(), unlocked: new Set() };

/**
 * One era's stretch of the trail: a panel whose height comes from the stage
 * count, with buttons swinging left and right along a sine path. `startIndex`
 * keeps the swing phase continuous across eras so the whole campaign reads as
 * one road.
 */
export function EraTrail({
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
        const centre = centres[i]!;
        return (
          <StageButton
            key={stage.id}
            stage={stage}
            colour={world.colour}
            unlocked={isStageUnlocked(stage.id, progress)}
            frontier={stage.id === frontierId}
            premiumLocked={premiumLocked}
            stars={progress[stage.id]?.stars ?? 0}
            x={centre.x}
            y={centre.y}
            owlSide={centre.x > width / 2 ? 'left' : 'right'}
            celebrate={kind === null ? null : { token: celebration.token, kind }}
            onPress={() => onOpenStage(stage)}
          />
        );
      })}
    </View>
  );
}

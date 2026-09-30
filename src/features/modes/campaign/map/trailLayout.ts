import type { CampaignRoute, CampaignStage, CampaignWorld } from '../campaignMap';
import {
  FINALE_MEDAL,
  NEXT_BANNER_GAP,
  NODE,
  REWARD_MEDAL,
  REWARD_PLAQUE_H,
  REWARD_STEP_Y,
  REWARD_TAIL,
  ROUTE_BANNER_H,
  ROUTE_BANNER_TOP,
  routeLane,
  stageCentreY,
  STEP_Y,
  TRAIL_TOP,
  TRAIL_DOT_SPACING,
  trailX,
} from './constants';
import { curveDots, type Point, type RoadDot } from './trailCurve';

export type { Point, RoadDot } from './trailCurve';

export interface TrailNode extends Point {
  stage: CampaignStage;
  /** Set for route stages. */
  route?: CampaignRoute;
}

/**
 * How a connector is lit: `stage` once its `fromId` stage is cleared, `lead`
 * (banner into the era's first stage) once the era is reached, `tail` (trophy
 * on into the next era) once the era is complete.
 */
export type SegmentKind = 'stage' | 'lead' | 'tail';

export interface TrailSegment {
  key: string;
  kind: SegmentKind;
  /** The stage whose clearing lights this connector (`stage`/`tail`), or a marker id (`lead`). */
  fromId: string;
  /** The stage it leads into, or a marker id (a route banner, the trophy, the next era). */
  toId: string;
  from: Point;
  to: Point;
  /** Where the connector's dots sit, along the S-curve from `from` to `to`. */
  dots: readonly RoadDot[];
}

/** The trophy medallion that closes an era (or, on the last era, the whole campaign). */
export interface RewardSpot extends Point {
  size: number;
  finale: boolean;
}

export interface RouteBannerSpot {
  route: CampaignRoute;
  left: number;
  top: number;
  width: number;
}

export interface TrailLayout {
  /** Every stage of the era, in play order. */
  nodes: readonly TrailNode[];
  /** Dotted connectors, each lit once its `fromId` stage is cleared. */
  segments: readonly TrailSegment[];
  banners: readonly RouteBannerSpot[];
  reward: RewardSpot;
  height: number;
}

/** The road runs this far in under a button's edge: the first dot sits right on the rim. */
const tuck = (edge: number) => edge - TRAIL_DOT_SPACING / 2;

/**
 * Where everything on one era's trail sits (trail-local coordinates). The
 * road leaves the era banner, and main stages swing along the sine path, the
 * phase continuing from `startIndex` so the campaign reads as one road. At
 * the fork the trail splits into two lanes — one per route, running in and
 * out of its banner, stages side by side — and merges back into the next main
 * stage, below which the swing carries on. After the last stage the road
 * reaches the era's trophy and, unless this is the `finale` era, runs on
 * under the next era's banner.
 */
export function eraTrailLayout(
  world: CampaignWorld,
  startIndex: number,
  width: number,
  finale = false,
): TrailLayout {
  const main = world.stages;
  const routes = world.routes;
  const forkIndex = routes.length > 0 ? main.findIndex((s) => s.id === routes[0]!.afterStageId) : -1;

  const nodes: TrailNode[] = [];
  const banners: RouteBannerSpot[] = [];
  const at = new Map<string, Point>();
  const place = (stage: CampaignStage, point: Point, route?: CampaignRoute) => {
    nodes.push(route === undefined ? { stage, ...point } : { stage, route, ...point });
    at.set(stage.id, point);
  };

  /** How far main stages after the fork are pushed down by the fork section. */
  let shift = 0;
  main.forEach((stage, i) => {
    place(stage, { x: trailX(startIndex + i, width), y: stageCentreY(i) + shift });
    if (i !== forkIndex) return;
    const forkY = stageCentreY(i) + shift;
    const bannerTop = forkY + ROUTE_BANNER_TOP;
    const firstRowY = bannerTop + ROUTE_BANNER_H + TRAIL_TOP + STEP_Y / 2;
    const rows = Math.max(...routes.map((r) => r.stages.length));
    routes.forEach((route, lane) => {
      const box = routeLane(lane, width);
      banners.push({ route, left: box.left, top: bannerTop, width: box.width });
      route.stages.forEach((s, r) => place(s, { x: box.centre, y: firstRowY + r * STEP_Y }, route));
    });
    const lastRowY = firstRowY + (rows - 1) * STEP_Y;
    shift = lastRowY + STEP_Y - stageCentreY(i + 1);
  });

  const lowest = Math.max(...nodes.map((n) => n.y));
  const size = finale ? FINALE_MEDAL : REWARD_MEDAL;
  const reward: RewardSpot = { x: width / 2, y: lowest + REWARD_STEP_Y, size, finale };
  const plaqueBottom = reward.y + size / 2 + REWARD_PLAQUE_H;
  const height = plaqueBottom + (finale ? REWARD_TAIL * 2 : REWARD_TAIL);

  // Dots never run under a route banner the road isn't meant to enter.
  const avoid = banners.map((b) => ({ left: b.left, top: b.top, width: b.width, height: ROUTE_BANNER_H }));
  const segments: TrailSegment[] = [];
  const road = (
    key: string,
    kind: SegmentKind,
    fromId: string,
    toId: string,
    from: Point,
    to: Point,
    startRadius: number,
    endRadius: number,
    avoiding = avoid,
  ) => {
    const dots = curveDots(from, to, {
      radius: 0,
      startRadius,
      endRadius,
      spacing: TRAIL_DOT_SPACING,
      avoid: avoiding,
    });
    segments.push({ key, kind, fromId, toId, from, to, dots });
  };
  const button = tuck(NODE / 2);
  const link = (from: CampaignStage, to: CampaignStage) =>
    road(`${from.id}>${to.id}`, 'stage', from.id, to.id, at.get(from.id)!, at.get(to.id)!, button, button);

  // Out of the era banner (just above the trail) into the first stage.
  const first = main[0];
  if (first !== undefined) {
    road(`start>${first.id}`, 'lead', `start:${world.id}`, first.id, { x: width / 2, y: -8 }, at.get(first.id)!, 0, button);
  }
  main.forEach((stage, i) => {
    const next = main[i + 1];
    if (i !== forkIndex) {
      if (next !== undefined) link(stage, next);
      return;
    }
    const fork = at.get(stage.id)!;
    for (const [lane, route] of routes.entries()) {
      const banner = banners[lane]!;
      const centre = banner.left + banner.width / 2;
      const opener = route.stages[0]!;
      // Into the top of the route's signpost, and out of its foot to the opener.
      road(`${stage.id}>route:${route.id}`, 'stage', stage.id, `route:${route.id}`, fork, { x: centre, y: banner.top }, button, 0, []);
      road(`route:${route.id}>${opener.id}`, 'stage', stage.id, opener.id, { x: centre, y: banner.top + ROUTE_BANNER_H }, at.get(opener.id)!, 0, button, []);
      route.stages.slice(1).forEach((s, r) => link(route.stages[r]!, s));
      if (next !== undefined) link(route.stages.at(-1)!, next);
    }
  });

  // The last stage leads to the era's trophy, and the road runs on under the next banner.
  const last = main.at(-1);
  if (last !== undefined) {
    road(`${last.id}>reward`, 'stage', last.id, `reward:${world.id}`, at.get(last.id)!, reward, button, tuck(size / 2));
    if (!finale) {
      road(
        `reward>next`,
        'tail',
        last.id,
        `next:${world.id}`,
        { x: reward.x, y: plaqueBottom },
        { x: reward.x, y: height + NEXT_BANNER_GAP + 12 },
        0,
        0,
      );
    }
  }

  return { nodes, segments, banners, reward, height };
}

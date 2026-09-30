import type { CampaignRoute, CampaignStage, CampaignWorld } from '../campaignMap';
import {
  NODE,
  ROUTE_BANNER_H,
  ROUTE_BANNER_TOP,
  routeLane,
  stageCentreY,
  STEP_Y,
  TRAIL_TOP,
  TRAIL_DOT_LIT,
  TRAIL_DOT_SPACING,
  trailX,
} from './constants';
import { curveDots, type Point } from './trailCurve';

export type { Point } from './trailCurve';

export interface TrailNode extends Point {
  stage: CampaignStage;
  /** Set for route stages. */
  route?: CampaignRoute;
}

export interface TrailSegment {
  fromId: string;
  toId: string;
  from: Point;
  to: Point;
  /** Where the connector's dots sit, along the S-curve from `from` to `to`. */
  dots: readonly Point[];
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
  height: number;
}

/**
 * Where everything on one era's trail sits (trail-local coordinates). Main
 * stages swing along the sine path, the phase continuing from `startIndex`
 * so the campaign reads as one road. At the fork the trail splits into two
 * lanes — one per route, each under its banner, stages side by side — and
 * merges back into the next main stage, below which the swing carries on.
 */
export function eraTrailLayout(world: CampaignWorld, startIndex: number, width: number): TrailLayout {
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

  // Dots stay clear of the buttons and never run under a route banner.
  const avoid = banners.map((b) => ({
    left: b.left - 4,
    top: b.top - 4,
    width: b.width + 8,
    height: ROUTE_BANNER_H + 8,
  }));
  const segments: TrailSegment[] = [];
  const link = (from: CampaignStage, to: CampaignStage) => {
    const a = at.get(from.id)!;
    const b = at.get(to.id)!;
    const dots = curveDots(a, b, { radius: NODE / 2 + TRAIL_DOT_LIT / 2 + 2, spacing: TRAIL_DOT_SPACING, avoid });
    segments.push({ fromId: from.id, toId: to.id, from: a, to: b, dots });
  };
  main.forEach((stage, i) => {
    const next = main[i + 1];
    if (i !== forkIndex) {
      if (next !== undefined) link(stage, next);
      return;
    }
    for (const route of routes) {
      route.stages.forEach((s, r) => link(r === 0 ? stage : route.stages[r - 1]!, s));
      if (next !== undefined) link(route.stages.at(-1)!, next);
    }
  });

  const lowest = Math.max(...nodes.map((n) => n.y));
  return { nodes, segments, banners, height: lowest + STEP_Y / 2 + 14 };
}

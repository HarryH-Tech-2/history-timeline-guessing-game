import { FIXTURE_POOL, FIXTURE_ROUTE_SPECS, FIXTURE_WORLDS } from '../__fixtures__/routedCampaign';
import { buildCampaign, worldStages } from '../campaignMap';
import {
  FRONTIER_NODE,
  NODE,
  ROUTE_BANNER_H,
  routeLane,
  stageCentreY,
  STEP_Y,
  TRAIL_TOP,
  trailX,
} from './constants';
import { eraTrailLayout } from './trailLayout';

const ancient = FIXTURE_WORLDS[0]!;
const W = 392;

function byId(layout: ReturnType<typeof eraTrailLayout>) {
  return new Map(layout.nodes.map((n) => [n.stage.id, n] as const));
}

describe('eraTrailLayout', () => {
  it('lays out an era without routes exactly as the plain trail did', () => {
    const [plain] = buildCampaign(FIXTURE_POOL, [], FIXTURE_ROUTE_SPECS);
    const layout = eraTrailLayout(plain!, 3, W);
    expect(layout.nodes.map((n) => [n.stage.id, n.x, n.y])).toEqual(
      plain!.stages.map((s, i) => [s.id, trailX(3 + i, W), stageCentreY(i)]),
    );
    expect(layout.height).toBe(TRAIL_TOP + plain!.stages.length * STEP_Y + 14);
    expect(layout.segments).toHaveLength(plain!.stages.length - 1);
    expect(layout.banners).toEqual([]);
  });

  it('places every stage once, in play order', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    expect(layout.nodes.map((n) => n.stage.id)).toEqual(worldStages(ancient).map((s) => s.id));
  });

  it('splits the fork into two side-by-side lanes that rejoin below', () => {
    const nodes = byId(eraTrailLayout(ancient, 0, W));
    const fork = nodes.get('ancient-s2')!;
    for (const [lane, route] of ['north', 'south'].entries()) {
      for (let r = 1; r <= 3; r += 1) {
        const node = nodes.get(`ancient-${route}-s${r}`)!;
        expect(node.x).toBe(routeLane(lane, W).centre);
        expect(node.route?.id).toBe(route);
        expect(node.y).toBe(nodes.get(`ancient-north-s${r}`)!.y);
      }
    }
    expect(nodes.get('ancient-north-s1')!.y).toBeGreaterThan(fork.y);
    const rejoin = nodes.get('ancient-s3')!;
    expect(rejoin.y).toBe(nodes.get('ancient-north-s3')!.y + STEP_Y);
    expect(rejoin.x).toBe(trailX(2, W));
    expect(nodes.get('ancient-s4')!.y).toBe(rejoin.y + STEP_Y);
  });

  it('forks the dotted trail out of the fork stage and merges it into the rejoin', () => {
    const pairs = eraTrailLayout(ancient, 0, W).segments.map((s) => `${s.fromId}>${s.toId}`);
    expect(pairs).toEqual([
      'ancient-s1>ancient-s2',
      'ancient-s2>ancient-north-s1',
      'ancient-north-s1>ancient-north-s2',
      'ancient-north-s2>ancient-north-s3',
      'ancient-north-s3>ancient-s3',
      'ancient-s2>ancient-south-s1',
      'ancient-south-s1>ancient-south-s2',
      'ancient-south-s2>ancient-south-s3',
      'ancient-south-s3>ancient-s3',
      'ancient-s3>ancient-s4',
      'ancient-s4>ancient-s5',
      'ancient-s5>ancient-s6',
    ]);
  });

  it('heads each lane with a banner between the fork and the first route stage', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    const nodes = byId(layout);
    expect(layout.banners.map((b) => b.route.id)).toEqual(['north', 'south']);
    for (const banner of layout.banners) {
      expect(banner.top).toBeGreaterThan(nodes.get('ancient-s2')!.y + NODE / 2);
      expect(banner.top + ROUTE_BANNER_H).toBeLessThan(nodes.get('ancient-north-s1')!.y - NODE / 2);
    }
  });

  it.each([320, 360, 392, 430])('keeps both lanes and banners on screen and apart at %i dp', (width) => {
    const [left, right] = eraTrailLayout(ancient, 0, width).banners;
    expect(left!.left).toBeGreaterThanOrEqual(16);
    expect(left!.left + left!.width).toBeLessThan(right!.left);
    expect(right!.left + right!.width).toBeLessThanOrEqual(width - 16);
    expect(routeLane(1, width).centre - routeLane(0, width).centre).toBeGreaterThan(NODE + 20);
  });

  it.each([320, 360, 392, 430])('keeps every stage button at least 16 dp from the edges at %i dp', (width) => {
    for (const start of [0, 1, 2, 3, 4, 5]) {
      for (const n of eraTrailLayout(ancient, start, width).nodes) {
        expect(n.x - FRONTIER_NODE / 2).toBeGreaterThanOrEqual(16);
        expect(n.x + FRONTIER_NODE / 2).toBeLessThanOrEqual(width - 16);
      }
    }
  });

  it('spaces stages well apart and lays each connector as a close-dotted road', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    const main = layout.nodes.filter((n) => n.route === undefined);
    for (let i = 1; i < main.length; i += 1) {
      expect(main[i]!.y - main[i - 1]!.y).toBeGreaterThanOrEqual(STEP_Y);
    }
    expect(STEP_Y).toBeGreaterThanOrEqual(170);
    // Fork connectors run under the route banners, which leave a deliberate hole.
    const underBanner = new Set(ancient.routes.map((r) => r.stages[0]!.id));
    for (const segment of layout.segments.filter((s) => !underBanner.has(s.toId))) {
      const gaps = segment.dots
        .slice(1)
        .map((d, i) => Math.hypot(d.x - segment.dots[i]!.x, d.y - segment.dots[i]!.y));
      for (const gap of gaps) expect(gap).toBeLessThan(20);
    }
  });

  it('dots each connector along its curve, clear of the buttons and the route banners', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    for (const segment of layout.segments) {
      expect(segment.dots.length).toBeGreaterThan(0);
      for (const d of segment.dots) {
        expect(Math.hypot(d.x - segment.from.x, d.y - segment.from.y)).toBeGreaterThanOrEqual(NODE / 2);
        expect(Math.hypot(d.x - segment.to.x, d.y - segment.to.y)).toBeGreaterThanOrEqual(NODE / 2);
        for (const b of layout.banners) {
          const under =
            d.x >= b.left && d.x <= b.left + b.width && d.y >= b.top && d.y <= b.top + ROUTE_BANNER_H;
          expect(under).toBe(false);
        }
      }
    }
    // Fork connectors bend out into their lane: not a straight line from the fork.
    const out = layout.segments.find((s) => s.toId === 'ancient-north-s1')!;
    const firstDot = out.dots[0]!;
    expect(Math.abs(firstDot.x - out.from.x)).toBeLessThan(Math.abs(firstDot.y - out.from.y));
  });

  it('grows the trail by the fork section', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    const lowest = Math.max(...layout.nodes.map((n) => n.y));
    expect(layout.height).toBe(lowest + STEP_Y / 2 + 14);
  });
});

import { FIXTURE_POOL, FIXTURE_ROUTE_SPECS, FIXTURE_WORLDS } from '../__fixtures__/routedCampaign';
import { buildCampaign, worldStages } from '../campaignMap';
import {
  FINALE_MEDAL,
  FRONTIER_NODE,
  NEXT_BANNER_GAP,
  NODE,
  REWARD_MEDAL,
  REWARD_PLAQUE_H,
  REWARD_STEP_Y,
  REWARD_TAIL,
  ROUTE_BANNER_H,
  routeLane,
  stageCentreY,
  STEP_Y,
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
    // One road between each pair of stages, plus in from the banner, on to the trophy and out.
    expect(layout.segments).toHaveLength(plain!.stages.length + 2);
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

  it('centres the very first stage of the campaign under its banner', () => {
    expect(eraTrailLayout(ancient, 0, W).nodes[0]!.x).toBe(W / 2);
  });

  it("runs the road from the banner, through the fork's signposts, to the trophy and on", () => {
    const roads = eraTrailLayout(ancient, 0, W).segments.map((s) => `${s.kind} ${s.fromId}>${s.toId}`);
    expect(roads).toEqual([
      'lead start:ancient>ancient-s1',
      'stage ancient-s1>ancient-s2',
      'stage ancient-s2>route:north',
      'stage ancient-s2>ancient-north-s1',
      'stage ancient-north-s1>ancient-north-s2',
      'stage ancient-north-s2>ancient-north-s3',
      'stage ancient-north-s3>ancient-s3',
      'stage ancient-s2>route:south',
      'stage ancient-s2>ancient-south-s1',
      'stage ancient-south-s1>ancient-south-s2',
      'stage ancient-south-s2>ancient-south-s3',
      'stage ancient-south-s3>ancient-s3',
      'stage ancient-s3>ancient-s4',
      'stage ancient-s4>ancient-s5',
      'stage ancient-s5>ancient-s6',
      'stage ancient-s6>reward:ancient',
      'tail ancient-s6>next:ancient',
    ]);
  });

  it('plugs the fork roads into the top and foot of each route signpost', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    for (const banner of layout.banners) {
      const centre = banner.left + banner.width / 2;
      const into = layout.segments.find((s) => s.toId === `route:${banner.route.id}`)!;
      expect(into.to).toEqual({ x: centre, y: banner.top });
      const outOf = layout.segments.find((s) => s.toId === `ancient-${banner.route.id}-s1`)!;
      expect(outOf.from).toEqual({ x: centre, y: banner.top + ROUTE_BANNER_H });
    }
  });

  it('ends the era at a centred trophy below its last stage, the road running on into the next era', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    const last = layout.nodes.find((n) => n.stage.id === 'ancient-s6')!;
    expect(layout.reward).toEqual({ x: W / 2, y: last.y + REWARD_STEP_Y, size: REWARD_MEDAL, finale: false });
    expect(layout.height).toBe(layout.reward.y + REWARD_MEDAL / 2 + REWARD_PLAQUE_H + REWARD_TAIL);
    const tail = layout.segments.at(-1)!;
    expect(tail.kind).toBe('tail');
    // Past the trail's bottom, under the next era's banner.
    expect(tail.to.y).toBeGreaterThan(layout.height + NEXT_BANNER_GAP);
  });

  it('gives the last era the grand trophy and no road beyond it', () => {
    const layout = eraTrailLayout(ancient, 0, W, true);
    expect(layout.reward.size).toBe(FINALE_MEDAL);
    expect(layout.reward.finale).toBe(true);
    expect(layout.segments.some((s) => s.kind === 'tail')).toBe(false);
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
    for (const segment of layout.segments) {
      const gaps = segment.dots
        .slice(1)
        .map((d, i) => Math.hypot(d.x - segment.dots[i]!.x, d.y - segment.dots[i]!.y));
      for (const gap of gaps) expect(gap).toBeLessThan(20);
    }
  });

  it('runs each road right up to the buttons it joins, never under a route banner', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    const stageIds = new Set(layout.nodes.map((n) => n.stage.id));
    for (const segment of layout.segments) {
      expect(segment.dots.length).toBeGreaterThan(0);
      const first = segment.dots[0]!;
      const last = segment.dots.at(-1)!;
      if (stageIds.has(segment.fromId) && segment.kind === 'stage' && !segment.key.startsWith('route:')) {
        // The first dash sits on the button's rim: touching it, not floating clear.
        expect(Math.abs(Math.hypot(first.x - segment.from.x, first.y - segment.from.y) - NODE / 2)).toBeLessThan(2);
      }
      if (stageIds.has(segment.toId)) {
        expect(Math.abs(Math.hypot(last.x - segment.to.x, last.y - segment.to.y) - NODE / 2)).toBeLessThan(2);
      }
      for (const d of segment.dots) {
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
    expect(layout.reward.y).toBe(lowest + REWARD_STEP_Y);
  });
});

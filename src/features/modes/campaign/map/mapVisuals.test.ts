import { FIXTURE_WORLDS } from '../__fixtures__/routedCampaign';
import {
  backdropProbe,
  bannerTucked,
  DARK_INK,
  eraInView,
  FINALE_SYMBOL,
  inkOn,
  nodeState,
  ROUTE_SYMBOL,
  shade,
  STAGE_SYMBOLS,
  stageSymbol,
  tint,
} from './mapVisuals';

describe('eraInView', () => {
  const sections = [
    { id: 'ancient', y: 60 },
    { id: 'medieval', y: 900 },
    { id: 'modern', y: 2000 },
  ];

  it('is the first era before any section reaches the probe line', () => {
    expect(eraInView(sections, 0)).toBe('ancient');
  });

  it('switches once the next section crosses the probe line', () => {
    expect(eraInView(sections, 899)).toBe('ancient');
    expect(eraInView(sections, 900)).toBe('medieval');
    expect(eraInView(sections, 1999)).toBe('medieval');
    expect(eraInView(sections, 5000)).toBe('modern');
  });

  it('ignores the order sections were measured in', () => {
    expect(eraInView([...sections].reverse(), 1000)).toBe('medieval');
  });

  it('is undefined with nothing measured', () => {
    expect(eraInView([], 100)).toBeUndefined();
  });
});

describe('bannerTucked', () => {
  it('is false while the banner still shows below the probe line', () => {
    expect(bannerTucked(200, 100)).toBe(false);
    expect(bannerTucked(101, 100)).toBe(false);
  });

  it('is true once the banner has scrolled up under the probe line', () => {
    expect(bannerTucked(100, 100)).toBe(true);
    expect(bannerTucked(40, 100)).toBe(true);
  });

  it('is false before the banner has been measured', () => {
    expect(bannerTucked(undefined, 1000)).toBe(false);
  });
});

describe('nodeState', () => {
  const base = { unlocked: true, frontier: false, premiumLocked: false, stars: 0 };

  it('locks stages that are not yet reachable', () => {
    expect(nodeState({ ...base, unlocked: false })).toBe('locked');
  });

  it('crowns premium stages for free players, whatever their progress', () => {
    expect(nodeState({ ...base, unlocked: false, premiumLocked: true })).toBe('premium');
    expect(nodeState({ ...base, premiumLocked: true, stars: 2 })).toBe('premium');
  });

  it('marks the next stage to play as the frontier, premium or not', () => {
    expect(nodeState({ ...base, frontier: true })).toBe('frontier');
    expect(nodeState({ ...base, frontier: true, premiumLocked: true })).toBe('frontier');
  });

  it('tells one- and two-star clears from three-star masteries', () => {
    expect(nodeState({ ...base, stars: 1 })).toBe('completed');
    expect(nodeState({ ...base, stars: 2 })).toBe('completed');
    expect(nodeState({ ...base, stars: 3 })).toBe('mastered');
  });

  it('treats an unlocked, unplayed stage off the frontier as open', () => {
    expect(nodeState(base)).toBe('open');
  });
});

describe('inkOn', () => {
  it('uses dark ink on the pale and bright era colours', () => {
    expect(inkOn('#A9B6C2')).toBe(DARK_INK); // modern: pale grey
    expect(inkOn('#E7B84C')).toBe(DARK_INK); // ancient: gold
    expect(inkOn('#57BE8F')).toBe(DARK_INK); // early modern: green
  });

  it('uses white on the deeper era colours', () => {
    expect(inkOn('#B07BD9')).toBe('#FFFFFF'); // medieval: purple
    expect(inkOn('#E8564E')).toBe('#FFFFFF'); // 19th century: red
  });
});

describe('shade', () => {
  it('darkens each channel by the given fraction', () => {
    expect(shade('#FFFFFF', 0.5)).toBe('#808080');
    expect(shade('#E8564E', 0)).toBe('#E8564E');
    expect(shade('#E8564E', 1)).toBe('#000000');
  });
});

describe('tint', () => {
  it('lightens each channel towards white by the given fraction', () => {
    expect(tint('#000000', 0.5)).toBe('#808080');
    expect(tint('#E8564E', 0)).toBe('#E8564E');
    expect(tint('#E8564E', 1)).toBe('#FFFFFF');
  });
});

describe('backdropProbe', () => {
  it('is the middle of the viewport in content space', () => {
    expect(backdropProbe(0, 800)).toBe(400);
    expect(backdropProbe(1150, 800)).toBe(1550);
  });
});

describe('stageSymbol', () => {
  const world = FIXTURE_WORLDS[0]!;

  it('cycles main stages through the themed set, the same symbol every time', () => {
    const body = world.stages.slice(0, -1);
    const symbols = body.map((s) => stageSymbol(s, world));
    expect(symbols).toEqual(body.map((s) => stageSymbol(s, world)));
    symbols.forEach((symbol) => expect(STAGE_SYMBOLS).toContain(symbol));
    for (let i = 1; i < symbols.length; i += 1) expect(symbols[i]).not.toBe(symbols[i - 1]);
  });

  it('marks the era finale on the last main stage', () => {
    expect(stageSymbol(world.stages.at(-1)!, world)).toBe(FINALE_SYMBOL);
  });

  it('marks every route stage with the route pennant', () => {
    const routeStages = world.routes.flatMap((r) => r.stages);
    expect(routeStages.length).toBeGreaterThan(0);
    for (const s of routeStages) expect(stageSymbol(s, world)).toBe(ROUTE_SYMBOL);
  });

  it('never uses digits or colour-emoji forms', () => {
    for (const symbol of [...STAGE_SYMBOLS, FINALE_SYMBOL, ROUTE_SYMBOL]) {
      expect(symbol).not.toMatch(/\d/);
      expect(symbol).not.toMatch(/\uFE0F/);
      expect([...symbol.replace('\uFE0E', '')]).toHaveLength(1);
    }
  });
});

import { FIXTURE_WORLDS } from '../__fixtures__/routedCampaign';
import {
  backdropProbe,
  bannerTucked,
  DARK_INK,
  eraInView,
  DEFAULT_ICONS,
  ERA_ICONS,
  FINALE_ICON,
  inkOn,
  nodeState,
  ROUTE_ICON,
  ROUTE_ICONS,
  shade,
  stageIcon,
  tint,
} from './mapVisuals';
import { CAMPAIGN_ROUTE_SPECS } from '../../../../data/packs/campaignRoutes/routes';
import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';

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

describe('stageIcon', () => {
  const world = FIXTURE_WORLDS[0]!;

  it('cycles main stages through the era set, the same icon every time', () => {
    const body = world.stages.slice(0, -1);
    const icons = body.map((s) => stageIcon(s, world).icon);
    expect(icons).toEqual(body.map((s) => stageIcon(s, world).icon));
    const set = ERA_ICONS[world.id] ?? DEFAULT_ICONS;
    icons.forEach((icon) => expect(set).toContain(icon));
    for (let i = 1; i < icons.length; i += 1) expect(icons[i]).not.toBe(icons[i - 1]);
  });

  it('gives each era its own set, offset by era', () => {
    const stage = { ...world.stages[0]!, routeId: undefined };
    const at = (id: string, index: number) => stageIcon(stage, { ...world, id, index }).icon;
    expect(at('ancient', 1)).toBe('bank');
    expect(at('medieval', 2)).toBe('sword-cross');
    expect(at('modern', 5)).toBe('laptop');
    expect(at('unknown-era', 1)).toBe(DEFAULT_ICONS[0]);
  });

  it('marks the era finale on the last main stage', () => {
    expect(stageIcon(world.stages.at(-1)!, world)).toEqual({
      icon: FINALE_ICON,
    });
  });

  it("marks route stages with their route's icon, falling back for unknown routes", () => {
    const routeStages = world.routes.flatMap((r) => r.stages);
    expect(routeStages.length).toBeGreaterThan(0);
    for (const s of routeStages) expect(stageIcon(s, world).icon).toBe(ROUTE_ICON);
    const voyage = { ...routeStages[0]!, routeId: 'voyages' };
    expect(stageIcon(voyage, world).icon).toBe('sail-boat');
  });

  it('themes every real route', () => {
    for (const route of CAMPAIGN_ROUTE_SPECS) expect(ROUTE_ICONS[route.id]).toBeDefined();
  });

  it('only uses names that exist in the MaterialCommunityIcons glyph map', () => {
    const names = [
      ...Object.values(ERA_ICONS).flat(),
      ...DEFAULT_ICONS,
      FINALE_ICON,
      ROUTE_ICON,
      ...Object.values(ROUTE_ICONS),
    ];
    for (const name of names) expect(Object.keys(glyphMap)).toContain(name);
  });
});

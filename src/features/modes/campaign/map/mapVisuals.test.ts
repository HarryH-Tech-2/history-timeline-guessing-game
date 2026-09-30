import { backdropProbe, bannerTucked, DARK_INK, eraInView, inkOn, nodeState, shade } from './mapVisuals';

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

describe('backdropProbe', () => {
  it('is the middle of the viewport in content space', () => {
    expect(backdropProbe(0, 800)).toBe(400);
    expect(backdropProbe(1150, 800)).toBe(1550);
  });
});

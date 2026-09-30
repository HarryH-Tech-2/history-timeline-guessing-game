import { curveDots, curvePoint } from './trailCurve';

const from = { x: 100, y: 0 };
const to = { x: 260, y: 124 };
const opts = { radius: 40, spacing: 13 };

describe('curvePoint', () => {
  it('runs from one centre to the other, leaving and entering vertically', () => {
    expect(curvePoint(from, to, 0)).toEqual(from);
    expect(curvePoint(from, to, 1)).toEqual(to);
    const near = curvePoint(from, to, 0.01);
    expect(Math.abs(near.x - from.x)).toBeLessThan(Math.abs(near.y - from.y) / 10);
  });
});

describe('curveDots', () => {
  it('keeps every dot outside both buttons', () => {
    const dots = curveDots(from, to, opts);
    expect(dots.length).toBeGreaterThan(3);
    for (const d of dots) {
      expect(Math.hypot(d.x - from.x, d.y - from.y)).toBeGreaterThanOrEqual(40);
      expect(Math.hypot(d.x - to.x, d.y - to.y)).toBeGreaterThanOrEqual(40);
    }
  });

  it('places dots going steadily down the trail', () => {
    const dots = curveDots(from, to, opts);
    for (let i = 1; i < dots.length; i += 1) expect(dots[i]!.y).toBeGreaterThan(dots[i - 1]!.y);
  });

  it('spaces the dots evenly, near the target spacing', () => {
    const dots = curveDots(from, to, { ...opts, steps: 64 });
    const gaps = dots.slice(1).map((d, i) => Math.hypot(d.x - dots[i]!.x, d.y - dots[i]!.y));
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(13 * 0.75);
      expect(gap).toBeLessThan(13 * 1.25);
    }
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(1.5);
  });

  it('mirrors its dots when the segment is mirrored', () => {
    const dots = curveDots(from, to, opts);
    const mirrored = curveDots({ x: -from.x, y: from.y }, { x: -to.x, y: to.y }, opts);
    expect(mirrored).toHaveLength(dots.length);
    mirrored.forEach((d, i) => {
      expect(d.x).toBeCloseTo(-dots[i]!.x, 6);
      expect(d.y).toBeCloseTo(dots[i]!.y, 6);
    });
  });

  it('is symmetric about its midpoint', () => {
    const dots = curveDots(from, to, opts);
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    dots.forEach((d, i) => {
      const twin = dots[dots.length - 1 - i]!;
      expect(d.x + twin.x).toBeCloseTo(2 * mid.x, 1);
      expect(d.y + twin.y).toBeCloseTo(2 * mid.y, 1);
    });
  });

  it('draws a straight drop as a straight line of dots', () => {
    const dots = curveDots({ x: 50, y: 0 }, { x: 50, y: 124 }, opts);
    expect(dots.every((d) => d.x === 50)).toBe(true);
    expect(dots.length).toBe(Math.round((124 - 80) / 13));
  });

  it('leaves out dots under an avoided area', () => {
    const all = curveDots(from, to, opts);
    const box = { left: 0, top: 55, width: 400, height: 20 };
    const kept = curveDots(from, to, { ...opts, avoid: [box] });
    expect(kept.length).toBeLessThan(all.length);
    expect(kept.some((d) => d.y >= 55 && d.y <= 75)).toBe(false);
  });

  it('draws nothing when the buttons overlap', () => {
    expect(curveDots({ x: 0, y: 0 }, { x: 0, y: 60 }, opts)).toEqual([]);
  });
});

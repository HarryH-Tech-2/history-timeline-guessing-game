import { STEP_Y, TRAIL_DOT_SPACING } from './constants';
import { curveDots } from './trailCurve';
import { roadPieces, type Piece } from './TrailDots';

const ends = (p: Piece) => {
  const a = (p.angle * Math.PI) / 180;
  const h = p.length / 2;
  return {
    start: { x: p.x - h * Math.cos(a), y: p.y - h * Math.sin(a) },
    end: { x: p.x + h * Math.cos(a), y: p.y + h * Math.sin(a) },
  };
};

describe('roadPieces', () => {
  const dots = curveDots({ x: 60, y: 0 }, { x: 300, y: STEP_Y }, { radius: 34, spacing: TRAIL_DOT_SPACING });

  it('draws one piece per dot, each joining the next end to end', () => {
    const pieces = roadPieces(dots);
    expect(pieces).toHaveLength(dots.length);
    for (let i = 1; i < pieces.length; i += 1) {
      const prev = ends(pieces[i - 1]!).end;
      const next = ends(pieces[i]!).start;
      expect(Math.hypot(prev.x - next.x, prev.y - next.y)).toBeLessThan(0.01);
    }
  });

  it('turns only a little at each join, so the bends read smooth', () => {
    const pieces = roadPieces(dots);
    for (let i = 1; i < pieces.length; i += 1) {
      expect(Math.abs(pieces[i]!.angle - pieces[i - 1]!.angle)).toBeLessThan(15);
    }
  });

  it('breaks the road across a gap instead of bridging it', () => {
    const gapped = [...dots.slice(0, 4), ...dots.slice(9)];
    const pieces = roadPieces(gapped);
    const before = ends(pieces[3]!).end;
    const after = ends(pieces[4]!).start;
    expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeGreaterThan(TRAIL_DOT_SPACING * 2);
  });
});

/**
 * Pure geometry for the campaign trail's curved connectors: dots spaced
 * evenly along a vertical-tangent cubic Bézier between two stage centres.
 * No React here, so it's unit-testable.
 */

export interface Point {
  x: number;
  y: number;
}

/** A dot on the road: where it sits, and which way the road runs there (degrees, 0 = rightwards). */
export interface RoadDot extends Point {
  angle: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CurveDotOptions {
  /** Dots closer than this to either end (the stage buttons) are left out. */
  radius: number;
  /** Overrides `radius` at the start / end (e.g. 0 where the road meets a banner edge). */
  startRadius?: number;
  endRadius?: number;
  /** Target distance between neighbouring dots, along the curve. */
  spacing: number;
  /** Areas the trail runs under (route banners): no dots drawn there. */
  avoid?: readonly Rect[];
  /** Curve samples used to measure arc length. */
  steps?: number;
}

/**
 * The S-curve from `from` to `to`: it leaves and enters both ends vertically
 * (control points half the height straight below/above), so the zig-zag reads
 * as a winding road and fork lanes bend out and back in.
 */
export function curvePoint(from: Point, to: Point, t: number): Point {
  const dy = to.y - from.y;
  const c1 = { x: from.x, y: from.y + dy * 0.5 };
  const c2 = { x: to.x, y: to.y - dy * 0.5 };
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * from.x + b * c1.x + c * c2.x + d * to.x,
    y: a * from.y + b * c1.y + c * c2.y + d * to.y,
  };
}

function inside(p: Point, r: Rect): boolean {
  return p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height;
}

/**
 * Dots along the curve between two stage centres, evenly spaced by arc length
 * over the stretch outside both buttons (`radius`), centred in it, and none
 * under an `avoid` rect. Mirroring a segment mirrors its dots.
 */
export function curveDots(from: Point, to: Point, opts: CurveDotOptions): RoadDot[] {
  const steps = opts.steps ?? 32;
  const samples: Point[] = [];
  const lengths: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const p = curvePoint(from, to, i / steps);
    const prev = samples[i - 1];
    lengths.push(prev === undefined ? 0 : lengths[i - 1]! + Math.hypot(p.x - prev.x, p.y - prev.y));
    samples.push(p);
  }

  /** The point `s` along the curve, interpolated between samples. */
  const at = (s: number): Point => {
    let i = 1;
    while (i < steps && lengths[i]! < s) i += 1;
    const s0 = lengths[i - 1]!;
    const span = lengths[i]! - s0;
    const f = span > 0 ? Math.min(1, Math.max(0, (s - s0) / span)) : 0;
    const a = samples[i - 1]!;
    const b = samples[i]!;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };

  // Arc positions where the curve leaves the start button and enters the end one.
  const total = lengths[steps]!;
  const crossing = (centre: Point, fromStart: boolean): number => {
    const radius = (fromStart ? opts.startRadius : opts.endRadius) ?? opts.radius;
    const clear = (p: Point, c: Point) => Math.hypot(p.x - c.x, p.y - c.y) >= radius;
    const range = fromStart ? [...lengths.keys()] : [...lengths.keys()].reverse();
    for (const i of range) {
      if (!clear(samples[i]!, centre)) continue;
      // Refine between this sample and its neighbour inside the circle.
      const j = fromStart ? i - 1 : i + 1;
      if (j < 0 || j > steps) return lengths[i]!;
      let lo = lengths[j]!;
      let hi = lengths[i]!;
      for (let k = 0; k < 12; k += 1) {
        const mid = (lo + hi) / 2;
        if (clear(at(mid), centre)) hi = mid;
        else lo = mid;
      }
      return hi;
    }
    return fromStart ? total : 0;
  };
  const start = crossing(from, true);
  const end = crossing(to, false);
  const usable = end - start;
  if (usable <= 0) return [];

  const count = Math.max(1, Math.round(usable / opts.spacing));
  const step = usable / count;
  const dots: RoadDot[] = [];
  for (let i = 0; i < count; i += 1) {
    const s = start + (i + 0.5) * step;
    const p = at(s);
    if ((opts.avoid ?? []).some((r) => inside(p, r))) continue;
    // The road's heading here, from a short chord either side.
    const a = at(Math.max(0, s - 2));
    const b = at(Math.min(total, s + 2));
    dots.push({ ...p, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI });
  }
  return dots;
}

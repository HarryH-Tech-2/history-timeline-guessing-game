import { transformToFit, transformToReveal, worldXForYear } from './geometry';

const WIDTH = 360;

function screenX(year: number, t: { translateX: number; scale: number }): number {
  return worldXForYear(year) * t.scale + t.translateX;
}

describe('transformToReveal', () => {
  it('leaves the view untouched when guess and answer are already on screen', () => {
    const current = transformToFit(1700, 2026, WIDTH);
    expect(transformToReveal(1800, 1900, WIDTH, current)).toBe(current);
  });

  it('pans without zooming when the answer is just off screen at the current zoom', () => {
    const current = transformToFit(1700, 2026, WIDTH);
    const next = transformToReveal(1680, 1850, WIDTH, current);
    expect(next.scale).toBe(current.scale);
    expect(next.translateX).not.toBe(current.translateX);
    expect(screenX(1680, next)).toBeGreaterThanOrEqual(0);
    expect(screenX(1850, next)).toBeLessThanOrEqual(WIDTH);
  });

  it('zooms out only when both years cannot fit at the current zoom', () => {
    const current = transformToFit(1900, 2026, WIDTH);
    const next = transformToReveal(-551, 1863, WIDTH, current);
    expect(next.scale).toBeLessThan(current.scale);
    expect(screenX(-551, next)).toBeGreaterThanOrEqual(0);
    expect(screenX(1863, next)).toBeLessThanOrEqual(WIDTH);
  });

  it('never pans the screen centre outside the playable range', () => {
    const current = transformToFit(1900, 2026, WIDTH);
    const next = transformToReveal(2020, 2026, WIDTH, current);
    // Centre year must stay <= PRESENT_YEAR: translateX <= width / 2.
    expect(next.translateX).toBeLessThanOrEqual(WIDTH / 2);
    expect(next.scale).toBe(current.scale);
  });
});

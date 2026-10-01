import { dragGain, FAST_GAIN, FAST_SPEED, PRECISE_GAIN, PRECISE_SPEED } from './dragGain';

describe('dragGain', () => {
  it('slows a careful drag to a fraction of the finger distance', () => {
    expect(dragGain(0)).toBe(PRECISE_GAIN);
    expect(dragGain(PRECISE_SPEED)).toBe(PRECISE_GAIN);
    expect(dragGain(-PRECISE_SPEED / 2)).toBe(PRECISE_GAIN);
  });

  it('speeds a quick swipe past 1:1', () => {
    expect(dragGain(FAST_SPEED)).toBe(FAST_GAIN);
    expect(dragGain(-5000)).toBe(FAST_GAIN);
    expect(FAST_GAIN).toBeGreaterThan(1);
  });

  it('rises smoothly and monotonically in between', () => {
    let previous = dragGain(PRECISE_SPEED);
    for (let v = PRECISE_SPEED; v <= FAST_SPEED; v += 20) {
      const g = dragGain(v);
      expect(g).toBeGreaterThanOrEqual(previous);
      expect(g - previous).toBeLessThan(0.05);
      previous = g;
    }
  });
});

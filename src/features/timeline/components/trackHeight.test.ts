import { trackHeightFor } from './TimelineTrack';

describe('trackHeightFor', () => {
  it('grows the track on tall screens and keeps the old size on short ones', () => {
    expect(trackHeightFor(900)).toBe(224);
    expect(trackHeightFor(820)).toBe(224);
    expect(trackHeightFor(760)).toBe(192);
    expect(trackHeightFor(640)).toBe(160);
    // Landscape phones report their short side as the height.
    expect(trackHeightFor(390)).toBe(160);
  });
});

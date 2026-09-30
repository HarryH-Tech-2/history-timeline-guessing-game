import { trackHeightFor } from './TimelineTrack';

describe('trackHeightFor', () => {
  it('grows the track on tall screens and keeps short ones compact', () => {
    expect(trackHeightFor(900)).toBe(172);
    expect(trackHeightFor(820)).toBe(172);
    expect(trackHeightFor(760)).toBe(160);
    expect(trackHeightFor(640)).toBe(148);
    // Landscape phones report their short side as the height.
    expect(trackHeightFor(390)).toBe(148);
  });
});

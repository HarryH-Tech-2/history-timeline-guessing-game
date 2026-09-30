const mockCapture = jest.fn();
jest.mock('./client', () => ({
  track: (event: string, props: unknown) => mockCapture(event, props),
}));

// eslint-disable-next-line import/first
import { resetTabTrackingForTests, trackTabSelected } from './tabTracking';

describe('trackTabSelected', () => {
  beforeEach(() => {
    mockCapture.mockClear();
    resetTabTrackingForTests(1_000_000);
  });

  it('marks the first tab tapped after opening the app, and how long after', () => {
    trackTabSelected('campaign', 1_004_400);
    expect(mockCapture).toHaveBeenCalledWith('tab_selected', {
      tab: 'campaign',
      first_this_open: true,
      seconds_since_open: 4,
    });
  });

  it('marks later taps in the same open as not first', () => {
    trackTabSelected('play', 1_001_000);
    trackTabSelected('campaign', 1_009_000);
    expect(mockCapture).toHaveBeenLastCalledWith('tab_selected', {
      tab: 'campaign',
      first_this_open: false,
      seconds_since_open: 9,
    });
  });

  it('starts afresh on the next open', () => {
    trackTabSelected('play', 1_001_000);
    resetTabTrackingForTests(2_000_000);
    trackTabSelected('campaign', 2_000_000);
    expect(mockCapture).toHaveBeenLastCalledWith('tab_selected', {
      tab: 'campaign',
      first_this_open: true,
      seconds_since_open: 0,
    });
  });
});

import { useEffect } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { EraOverviewBar } from './EraOverviewBar';
import { useTimelineTransform, type TimelineController } from '@/features/timeline/hooks/useTimelineTransform';
import { OVERVIEW_ERAS, overviewX } from '@/features/timeline/math';

const TRACK = 360;
const BAR = 300;

let controller: TimelineController | null = null;

function Harness({ disabled }: { disabled?: boolean }) {
  const c = useTimelineTransform({ haptics: false });
  useEffect(() => {
    controller = c;
  }, [c]);
  return <EraOverviewBar controller={c} disabled={disabled} />;
}

function layOut() {
  act(() => {
    controller!.onLayout({ nativeEvent: { layout: { width: TRACK, height: 160, x: 0, y: 0 } } } as never);
  });
  fireEvent(screen.getByTestId('era-overview'), 'layout', {
    nativeEvent: { layout: { width: BAR, height: 34, x: 0, y: 0 } },
  });
}

function settle() {
  act(() => {
    jest.advanceTimersByTime(2000);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  controller = null;
});
afterEach(() => {
  jest.useRealTimers();
});

describe('EraOverviewBar', () => {
  it('shows the five eras', () => {
    render(<Harness />);
    for (const era of OVERVIEW_ERAS) {
      expect(screen.getByTestId(`era-overview-${era.id}`)).toHaveTextContent(era.label);
    }
  });

  it('moves the timeline to the year tapped on the bar', () => {
    render(<Harness />);
    layOut();
    act(() => {
      fireGestureHandler(getByGestureTestId('overview-pan'), [{ x: overviewX(1969, BAR), y: 10 }]);
    });
    settle();
    expect(controller!.centreYear.value).toBeCloseTo(1969, 0);
  });

  it('scrubs with the finger as it drags along the bar', () => {
    render(<Harness />);
    layOut();
    act(() => {
      fireGestureHandler(getByGestureTestId('overview-pan'), [
        { x: overviewX(-500, BAR), y: 10 },
        { x: overviewX(1200, BAR), y: 10 },
        { x: overviewX(1453, BAR), y: 10 },
      ]);
    });
    settle();
    expect(controller!.centreYear.value).toBeCloseTo(1453, 0);
  });

  it('jumps to an era from a screen-reader action', () => {
    render(<Harness />);
    layOut();
    fireEvent(screen.getByTestId('era-overview'), 'accessibilityAction', {
      nativeEvent: { actionName: 'nineteenth' },
    });
    settle();
    expect(controller!.centreYear.value).toBeCloseTo(1850, 0);
  });

  it('leaves the timeline alone once the round is revealed', () => {
    render(<Harness disabled />);
    layOut();
    settle();
    const before = controller!.centreYear.value;
    act(() => {
      fireGestureHandler(getByGestureTestId('overview-pan'), [{ x: overviewX(-500, BAR), y: 10 }]);
    });
    settle();
    expect(controller!.centreYear.value).toBe(before);
  });
});

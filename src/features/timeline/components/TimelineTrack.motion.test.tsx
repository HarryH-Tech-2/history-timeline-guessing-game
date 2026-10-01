import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react-native';

import { TimelineTrack } from './TimelineTrack';
import {
  SETTLE_MS,
  useTimelineTransform,
  type TimelineController,
} from '@/features/timeline/hooks/useTimelineTransform';
import { BASE_WIDTH, MIN_YEAR, warp } from '@/features/timeline/math';

const WIDTH = 360;

let controller: TimelineController | null = null;
const captureController = (c: TimelineController) => {
  controller = c;
};

function Harness({ onController }: { onController: (controller: TimelineController) => void }) {
  const c = useTimelineTransform({ haptics: false });
  useEffect(() => {
    onController(c);
  }, [c, onController]);
  return <TimelineTrack controller={c} />;
}

/** translateX that puts `year` under the crosshair at the current zoom. */
function translateFor(year: number): number {
  return WIDTH / 2 - warp(year) * BASE_WIDTH * controller!.scale.value;
}

function layOut() {
  act(() => {
    controller!.onLayout({ nativeEvent: { layout: { width: WIDTH, height: 160, x: 0, y: 0 } } } as never);
  });
}

function rest() {
  act(() => {
    jest.advanceTimersByTime(SETTLE_MS + 100);
  });
}

type PanEvent = 'onBegin' | 'onUpdate' | 'onEnd' | 'onFinalize';
function firePan(name: PanEvent, payload: object = {}) {
  // Drive the pan's callbacks directly: RNGH's jest helper always replays a
  // complete BEGAN→ACTIVE→END sequence, so a finger can't be held down with it.
  const pan = controller!.gesture.toGestureArray().find((g) => g.handlers.onUpdate)!;
  (pan.handlers as unknown as Record<string, ((e: unknown) => void) | undefined>)[name]?.(payload);
}

beforeEach(() => {
  jest.useFakeTimers();
  controller = null;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('timeline stays React-quiet while it is moving', () => {
  it('reports rest only once the view has been still, with no finger down, for the settle window', () => {
    render(<Harness onController={captureController} />);
    layOut();
    rest();
    expect(controller!.atRest.value).toBe(true);

    act(() => {
      controller!.translateX.value = translateFor(1500);
    });
    expect(controller!.atRest.value).toBe(false);
    act(() => {
      jest.advanceTimersByTime(SETTLE_MS / 2);
    });
    expect(controller!.atRest.value).toBe(false);
    rest();
    expect(controller!.atRest.value).toBe(true);

    // A finger resting on the track keeps the view "moving" however long it stays.
    act(() => {
      firePan('onBegin');
      firePan('onUpdate', { translationX: -20 });
    });
    act(() => {
      jest.advanceTimersByTime(SETTLE_MS * 4);
    });
    expect(controller!.atRest.value).toBe(false);

    act(() => {
      firePan('onFinalize');
    });
    rest();
    expect(controller!.atRest.value).toBe(true);
  });

  it('never mounts or unmounts decade lines while panning, however far', () => {
    render(<Harness onController={captureController} />);
    layOut();
    rest();
    const slots = screen.getAllByTestId(/^timeline-decade-slot-/).length;
    expect(slots).toBeGreaterThan(0);

    // A fling across two millennia without ever coming to rest: the recycled
    // pool follows on the UI thread, so the React tree never changes.
    act(() => {
      firePan('onBegin');
      controller!.translateX.value = translateFor(-500);
    });
    expect(screen.getAllByTestId(/^timeline-decade-slot-/)).toHaveLength(slots);
    act(() => {
      controller!.translateX.value = translateFor(1950);
      firePan('onFinalize');
    });
    expect(screen.getAllByTestId(/^timeline-decade-slot-/)).toHaveLength(slots);
  });

  it('pans the crosshair onto 1000 BCE, with nothing drawn before it', () => {
    render(<Harness onController={captureController} />);
    layOut();
    expect(screen.queryByTestId('timeline-tick--1000')).not.toBeNull();
    expect(screen.queryByTestId('timeline-tick--1100')).toBeNull();

    // Drag far past the oldest end: the crosshair stops exactly on 1000 BCE.
    act(() => {
      firePan('onBegin');
      firePan('onUpdate', { translationX: 100000, velocityX: 5000 });
    });
    expect(controller!.translateX.value).toBeCloseTo(translateFor(MIN_YEAR));
    act(() => {
      firePan('onFinalize');
    });
  });
});

describe('precise year selection', () => {
  it('moves a slow drag less than the finger and settles on a whole year', () => {
    render(<Harness onController={captureController} />);
    layOut();
    const before = controller!.translateX.value;

    act(() => {
      firePan('onBegin');
      firePan('onUpdate', { translationX: -40, velocityX: -50 });
    });
    // Precision mode: 40px of careful finger travel moves the timeline 16px.
    expect(before - controller!.translateX.value).toBeCloseTo(16);

    act(() => {
      firePan('onEnd', { velocityX: -50 });
      firePan('onFinalize');
    });
    rest();
    const year = controller!.centreYear.value;
    expect(Math.abs(year - Math.round(year))).toBeLessThan(1e-6);
  });
});

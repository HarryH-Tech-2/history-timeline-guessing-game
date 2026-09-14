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

function Harness({
  onController,
  anchorYear,
}: {
  onController: (controller: TimelineController) => void;
  anchorYear?: number;
}) {
  const c = useTimelineTransform({ haptics: false });
  useEffect(() => {
    onController(c);
  }, [c, onController]);
  return <TimelineTrack controller={c} anchorYear={anchorYear} />;
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

type PanEvent = 'onBegin' | 'onUpdate' | 'onFinalize';
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

  it('keeps the mounted decade block while a finger is down and swaps it once at rest', () => {
    render(<Harness onController={captureController} />);
    layOut();
    act(() => {
      controller!.scale.value = 1;
      controller!.translateX.value = translateFor(1860);
    });
    rest();
    // Zoomed in around 1860: its 500-year block (and the neighbours) are mounted.
    expect(screen.queryByTestId('timeline-decade-1860')).not.toBeNull();
    expect(screen.queryByTestId('timeline-decade-410')).toBeNull();

    // Drag the crosshair to AD 400. Re-mounting ~100 ticks mid-gesture is a
    // React commit, and every React commit pauses Reanimated's own commits
    // until it has mounted — a visible hitch — so nothing changes yet.
    act(() => {
      firePan('onBegin');
      controller!.translateX.value = translateFor(400);
    });
    act(() => {
      jest.advanceTimersByTime(SETTLE_MS * 4);
    });
    expect(screen.queryByTestId('timeline-decade-1860')).not.toBeNull();
    expect(screen.queryByTestId('timeline-decade-410')).toBeNull();

    act(() => {
      firePan('onFinalize');
    });
    rest();
    expect(screen.queryByTestId('timeline-decade-410')).not.toBeNull();
    expect(screen.queryByTestId('timeline-decade-1860')).toBeNull();
  });

  it('keeps the decades around an anchor year mounted whatever the crosshair is doing', () => {
    render(<Harness onController={captureController} anchorYear={121} />);
    layOut();
    // Never came to rest, finger still down: the crosshair block is withheld,
    // but the anchor's 500-year block (and its neighbours) are there from the
    // first render.
    act(() => {
      firePan('onBegin');
    });
    expect(screen.queryByTestId('timeline-decade-130')).not.toBeNull();
    expect(screen.queryByTestId('timeline-decade-410')).not.toBeNull();
    expect(screen.queryByTestId('timeline-decade-1860')).toBeNull();

    act(() => {
      firePan('onFinalize');
    });
    rest();
    // At rest around 1863 the crosshair block joins the anchor's: both stay.
    expect(screen.queryByTestId('timeline-decade-1860')).not.toBeNull();
    expect(screen.queryByTestId('timeline-decade-130')).not.toBeNull();
  });

  it('draws gridlines beyond the 1000 BCE floor so the oldest end is never blank', () => {
    render(<Harness onController={captureController} />);
    layOut();
    act(() => {
      controller!.scale.value = 1;
      controller!.translateX.value = translateFor(MIN_YEAR);
    });
    rest();
    // The crosshair stops at 1000 BCE, but the left half of the track shows
    // the centuries before it — they need separators like everywhere else.
    expect(screen.queryByTestId('timeline-tick--1000')).not.toBeNull();
    expect(screen.queryByTestId('timeline-tick--1100')).not.toBeNull();
    expect(screen.queryByTestId('timeline-tick--1500')).not.toBeNull();
    expect(screen.queryByTestId('timeline-decade--1010')).not.toBeNull();
  });
});

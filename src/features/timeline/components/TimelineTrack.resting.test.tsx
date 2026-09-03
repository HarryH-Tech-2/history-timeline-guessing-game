import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react-native';

import { TimelineTrack } from './TimelineTrack';
import {
  useTimelineTransform,
  type TimelineController,
} from '@/features/timeline/hooks/useTimelineTransform';
import { worldXForYear } from '@/features/timeline/math';

let controller: TimelineController | null = null;
const captureController = (c: TimelineController) => {
  controller = c;
};

function Harness({
  revealYear,
  guessYear,
  onController,
}: {
  revealYear?: number;
  guessYear?: number;
  onController: (controller: TimelineController) => void;
}) {
  const c = useTimelineTransform({ haptics: false });
  useEffect(() => {
    onController(c);
  }, [c, onController]);
  return <TimelineTrack controller={c} revealYear={revealYear} guessYear={guessYear} />;
}

/** The plain (non-animated) style objects React renders for a host view. */
function plainStyles(testID: string): Record<string, unknown>[] {
  const style = screen.getByTestId(testID).props.style as unknown;
  const flat = (Array.isArray(style) ? style.flat(Infinity) : [style]) as unknown[];
  return flat.filter(
    (s): s is Record<string, unknown> =>
      typeof s === 'object' && s !== null && !('viewDescriptors' in s),
  );
}

function plainTranslateX(testID: string): number | undefined {
  const withTransform = plainStyles(testID)
    .map((s) => s.transform as { translateX?: number }[] | undefined)
    .filter((t): t is { translateX?: number }[] => Array.isArray(t));
  // Later entries win in React Native style flattening.
  return withTransform.at(-1)?.find((t) => 'translateX' in t)?.translateX;
}

beforeEach(() => {
  jest.useFakeTimers();
  controller = null;
});

afterEach(() => {
  jest.useRealTimers();
});

function settle(mutate: () => void) {
  act(() => {
    mutate();
  });
  act(() => {
    jest.advanceTimersByTime(500);
  });
}

describe('TimelineTrack resting styles', () => {
  it('mirrors the settled zoom and pan into plain React styles', () => {
    render(<Harness revealYear={1500} guessYear={1900} onController={captureController} />);

    settle(() => {
      controller!.scale.value = 0.2;
      controller!.translateX.value = 40;
    });

    expect(controller!.resting).toEqual({ scale: 0.2, translateX: 40 });
    expect(plainTranslateX('timeline-pan-layer')).toBe(40);
    expect(plainTranslateX('timeline-tick-1000')).toBeCloseTo(worldXForYear(1000) * 0.2 - 48);
    expect(plainTranslateX('reveal-marker-answer')).toBeCloseTo(worldXForYear(1500) * 0.2 - 64);
    expect(plainTranslateX('reveal-error-band')).toBeCloseTo(worldXForYear(1500) * 0.2);
  });

  it('keeps line opacity in the plain style in step with the settled zoom', () => {
    render(<Harness onController={captureController} />);

    // Century lines are fully on at scale 0.2 and faded out at 0.06.
    settle(() => {
      controller!.scale.value = 0.2;
    });
    let opacities = plainStyles('timeline-tick-line-1900').map((s) => s.opacity);
    expect(opacities.at(-1)).toBe(1);

    settle(() => {
      controller!.scale.value = 0.06;
    });
    opacities = plainStyles('timeline-tick-line-1900').map((s) => s.opacity);
    expect(opacities.at(-1)).toBeCloseTo(0.2);
  });

  it('does not take a snapshot until the transform has stopped changing', () => {
    render(<Harness onController={captureController} />);
    const before = controller!.resting;

    act(() => {
      controller!.scale.value = 0.5;
    });
    act(() => {
      jest.advanceTimersByTime(60);
      controller!.scale.value = 0.4;
    });
    act(() => {
      jest.advanceTimersByTime(60);
    });
    // Still moving: only 60ms since the last change.
    expect(controller!.resting).toBe(before);

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(controller!.resting.scale).toBe(0.4);
  });
});

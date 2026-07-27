import { useEffect, useRef, useState } from 'react';

/**
 * Animate an integer from 0 to `target` over `duration` ms using rAF. Cheap
 * enough for a one-shot reveal (a single number), and cancels cleanly if the
 * target changes mid-flight.
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic for a satisfying settle.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
}

import { useState, useEffect, useRef } from "react";

/**
 * Number scramble effect — when value changes, show random digits
 * briefly before settling on the final value. NASA-style readout feel.
 */
export function useScramble(value: number, duration = 250): string {
  const [display, setDisplay] = useState(String(value));
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;

    const valueStr = String(value);
    const steps = 4;
    const interval = duration / steps;
    let frame = 0;

    const id = setInterval(() => {
      if (frame < steps - 1) {
        // Generate random digits matching the format
        const scrambled = valueStr.replace(/\d/g, () =>
          String(Math.floor(Math.random() * 10))
        );
        setDisplay(scrambled);
      } else {
        setDisplay(valueStr);
        clearInterval(id);
      }
      frame++;
    }, interval);

    return () => clearInterval(id);
  }, [value, duration]);

  return display;
}

/**
 * Animated count-up from 0 to target value.
 * Used for completion summary cinematic effect.
 */
export function useCountUp(
  target: number,
  duration = 1000,
  enabled = true,
): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCurrent(0);
      return;
    }

    const startTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));

      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [target, duration, enabled]);

  return current;
}

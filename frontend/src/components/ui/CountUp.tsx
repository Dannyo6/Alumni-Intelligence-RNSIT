import React, { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'motion/react';

const formatValue = (n: number, separator: boolean) =>
  separator ? Math.round(n).toLocaleString() : String(Math.round(n));

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  className?: string;
  /** Render 6472 as "6,472". */
  separator?: boolean;
}

/**
 * Animates a number up to its final value once it scrolls into view.
 * Adapted from the React Bits CountUp pattern onto `motion`.
 * Falls back to the final value immediately under prefers-reduced-motion.
 */
export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 1.4,
  delay = 0,
  className,
  separator = true,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  const motionValue = useMotionValue(from);
  const spring = useSpring(motionValue, {
    damping: 26,
    stiffness: 90,
    duration: duration * 1000,
  });

  useEffect(() => {
    if (!ref.current) return;
    // Paint the starting value so the tile never flashes empty.
    ref.current.textContent = formatValue(inView && reduceMotion ? to : from, separator);
  }, [inView, reduceMotion, to, from, separator]);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      motionValue.set(to);
      return;
    }
    const timer = setTimeout(() => motionValue.set(to), delay * 1000);
    return () => clearTimeout(timer);
  }, [inView, reduceMotion, to, delay, motionValue]);

  useEffect(
    () =>
      spring.on('change', (latest: number) => {
        if (ref.current) ref.current.textContent = formatValue(latest, separator);
      }),
    [spring, separator],
  );

  return <span ref={ref} className={className} />;
};

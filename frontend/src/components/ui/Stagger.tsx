import React from 'react';
import { motion } from 'motion/react';

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  /** Seconds between each child. 30–50ms reads as a wave without dragging. */
  step?: number;
}

/**
 * Staggered entrance for lists and grids.
 * Deliberately uses a decelerating ease rather than an overshoot spring —
 * overshoot reads as sloppy on dense informational UI.
 */
export const Stagger: React.FC<StaggerProps> = ({ children, className, step = 0.035 }) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="show"
    variants={{ show: { transition: { staggerChildren: step } } }}
  >
    {children}
  </motion.div>
);

export const StaggerItem: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 10 },
      show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
    }}
  >
    {children}
  </motion.div>
);

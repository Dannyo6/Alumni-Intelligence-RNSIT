import React from 'react';
import { motion } from 'motion/react';

interface FadeInProps {
  children: React.ReactNode;
  /** Stagger index — multiplied by 0.04s so grids cascade in. */
  index?: number;
  className?: string;
  y?: number;
}

/** Subtle rise-and-fade entrance. Disabled automatically by reduced-motion CSS. */
export const FadeIn: React.FC<FadeInProps> = ({ children, index = 0, className, y = 8 }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

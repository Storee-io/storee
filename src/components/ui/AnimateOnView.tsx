'use client';

import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'scale' | 'none';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Entrance direction. Default: 'up' */
  direction?: Direction;
  /** Pixels to travel from initial to visible. Default: 20 */
  distance?: number;
  /** Delay in seconds. Default: 0 */
  delay?: number;
  /** Duration in seconds. Default: 0.5 */
  duration?: number;
  /** Trigger only once. Default: true */
  once?: boolean;
  /** Shorthand: set y offset (overrides direction for backwards compat) */
  y?: number;
}

function buildInitial(direction: Direction, distance: number) {
  switch (direction) {
    case 'up':    return { opacity: 0, y:  distance };
    case 'down':  return { opacity: 0, y: -distance };
    case 'left':  return { opacity: 0, x:  distance };
    case 'right': return { opacity: 0, x: -distance };
    case 'scale': return { opacity: 0, scale: 0.95 };
    case 'none':  return { opacity: 0 };
  }
}

function buildAnimate(direction: Direction) {
  switch (direction) {
    case 'left':
    case 'right': return { opacity: 1, x: 0 };
    case 'scale': return { opacity: 1, scale: 1 };
    default:      return { opacity: 1, y: 0 };
  }
}

export default function AnimateOnView({
  children,
  className,
  style,
  direction = 'up',
  distance = 20,
  delay = 0,
  duration = 0.5,
  once = true,
  y,
}: Props) {
  // backwards-compat: if `y` is set, treat as 'up' with custom distance
  const effectiveDirection: Direction = y !== undefined ? 'up' : direction;
  const effectiveDistance = y !== undefined ? y : distance;

  return (
    <motion.div
      className={className}
      style={style}
      initial={buildInitial(effectiveDirection, effectiveDistance)}
      whileInView={buildAnimate(effectiveDirection)}
      viewport={{ once, margin: '-40px' }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

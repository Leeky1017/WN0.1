/**
 * WriteNow Motion Presets
 *
 * Why: Centralize framer-motion animation presets to ensure consistency
 * across the application and align with CSS design tokens in motion.css.
 *
 * Usage:
 * ```tsx
 * import { transitions, animations, slideIn } from '@/lib/motion/presets';
 *
 * <motion.div
 *   initial="hidden"
 *   animate="visible"
 *   exit="exit"
 *   variants={animations.fadeIn}
 *   transition={transitions.normal}
 * />
 * ```
 */

import type { Transition, Variants } from 'framer-motion';

/* ===== Duration Tokens (aligned with motion.css) ===== */
export const durations = {
  instant: 0.05,   // 50ms - micro-interactions
  fast: 0.1,       // 100ms - quick state changes
  normal: 0.15,    // 150ms - standard transitions
  slow: 0.25,      // 250ms - complex animations
  slower: 0.4,     // 400ms - major layout shifts
} as const;

/* ===== Easing Functions (aligned with motion.css) ===== */
export const easings = {
  linear: 'linear' as const,
  /** Slow start, fast end - for exits */
  easeIn: [0.4, 0, 1, 1] as const,
  /** Fast start, slow end - for entrances */
  easeOut: [0.16, 1, 0.3, 1] as const,
  /** Slow start and end - for transforms */
  easeInOut: [0.65, 0, 0.35, 1] as const,
  /** Overshoot effect - for playful animations */
  spring: [0.34, 1.56, 0.64, 1] as const,
} as const;

/* ===== Transition Presets ===== */
export const transitions = {
  /** Instant feedback (hover, press) */
  instant: {
    duration: durations.instant,
    ease: easings.easeOut,
  } satisfies Transition,

  /** Quick state changes */
  fast: {
    duration: durations.fast,
    ease: easings.easeOut,
  } satisfies Transition,

  /** Standard UI transitions */
  normal: {
    duration: durations.normal,
    ease: easings.easeOut,
  } satisfies Transition,

  /** Complex multi-element animations */
  slow: {
    duration: durations.slow,
    ease: easings.easeOut,
  } satisfies Transition,

  /** Major layout changes */
  slower: {
    duration: durations.slower,
    ease: easings.easeInOut,
  } satisfies Transition,

  /** Spring physics for playful interactions */
  spring: {
    type: 'spring',
    damping: 25,
    stiffness: 300,
  } satisfies Transition,

  /** Snappy spring for overlays */
  springSnappy: {
    type: 'spring',
    damping: 30,
    stiffness: 400,
  } satisfies Transition,

  /** Gentle spring for content */
  springGentle: {
    type: 'spring',
    damping: 20,
    stiffness: 200,
  } satisfies Transition,
} as const;

/* ===== Animation Variants ===== */

/** Fade in/out animation */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.fast, ease: easings.easeIn },
  },
};

/** Slide up animation (for popovers, dropdowns) */
export const slideUp: Variants = {
  hidden: {
    opacity: 0,
    y: 4,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: { duration: durations.fast, ease: easings.easeIn },
  },
};

/** Slide down animation */
export const slideDown: Variants = {
  hidden: {
    opacity: 0,
    y: -4,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: durations.fast, ease: easings.easeIn },
  },
};

/** Scale in animation (for modals, dialogs) */
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: durations.fast, ease: easings.easeIn },
  },
};

/** Slide in from left (for sidebar panels) */
export const slideInLeft: Variants = {
  hidden: {
    x: '-100%',
    opacity: 0.8,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitions.springSnappy,
  },
  exit: {
    x: '-100%',
    opacity: 0.8,
    transition: { duration: durations.normal, ease: easings.easeIn },
  },
};

/** Slide in from right (for AI panel) */
export const slideInRight: Variants = {
  hidden: {
    x: '100%',
    opacity: 0.8,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitions.springSnappy,
  },
  exit: {
    x: '100%',
    opacity: 0.8,
    transition: { duration: durations.normal, ease: easings.easeIn },
  },
};

/** Expand/collapse animation (for accordions) */
export const collapse: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
  },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: transitions.slow,
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: durations.normal, ease: easings.easeIn },
  },
};

/* ===== Animation Collection ===== */
export const animations = {
  fadeIn,
  slideUp,
  slideDown,
  scaleIn,
  slideInLeft,
  slideInRight,
  collapse,
} as const;

/* ===== Helper Functions ===== */

/**
 * Create a slide-in variant with custom direction and distance.
 */
export function createSlideIn(
  direction: 'up' | 'down' | 'left' | 'right',
  distance: number | string = 8
): Variants {
  const sign = direction === 'down' || direction === 'right' ? -1 : 1;
  const offset = typeof distance === 'number' ? sign * distance : distance;

  // Use explicit axis properties to satisfy framer-motion types
  if (direction === 'up' || direction === 'down') {
    return {
      hidden: { opacity: 0, y: offset },
      visible: { opacity: 1, y: 0, transition: transitions.normal },
      exit: { opacity: 0, y: offset, transition: { duration: durations.fast, ease: easings.easeIn } },
    };
  }
  return {
    hidden: { opacity: 0, x: offset },
    visible: { opacity: 1, x: 0, transition: transitions.normal },
    exit: { opacity: 0, x: offset, transition: { duration: durations.fast, ease: easings.easeIn } },
  };
}

/**
 * Stagger children animation (for lists).
 */
export function createStaggerContainer(staggerDelay = 0.05): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: staggerDelay / 2,
        staggerDirection: -1,
      },
    },
  };
}

/**
 * Child item variant for stagger animations.
 */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: durations.fast, ease: easings.easeIn },
  },
};

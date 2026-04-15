// ═══════════════════════════════════════════════════════════════════════════════
// FRAMER MOTION ANIMATION VARIANTS
// Production-grade 2026 animation system for Nexus
// ═══════════════════════════════════════════════════════════════════════════════

import { Variants, Transition } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Shared spring configs
// ─────────────────────────────────────────────────────────────────────────────

export const springs = {
  /** Ultra-snappy for micro-interactions (buttons, icons) */
  snappy: { type: 'spring', stiffness: 700, damping: 35 } satisfies Transition,

  /** Smooth slide-ins and panels */
  smooth: { type: 'spring', stiffness: 300, damping: 30 } satisfies Transition,

  /** Gentle page transitions */
  gentle: { type: 'spring', stiffness: 200, damping: 25, mass: 0.8 } satisfies Transition,

  /** Bouncy for celebratory moments (likes, achievements) */
  bouncy: { type: 'spring', stiffness: 500, damping: 20 } satisfies Transition,

  /** Momentum: models physical deceleration */
  momentum: { type: 'spring', stiffness: 180, damping: 20, mass: 1.2 } satisfies Transition,

  /** Inertia for swipe gestures */
  inertia: { type: 'inertia', power: 0.8, timeConstant: 700 } satisfies Transition,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Page transitions
// ─────────────────────────────────────────────────────────────────────────────

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { ...springs.gentle, opacity: { duration: 0.25 } },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

export const slideInFromRight: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: {
    opacity: 1,
    x: 0,
    transition: springs.smooth,
  },
  exit: {
    opacity: 0,
    x: 40,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

export const slideInFromLeft: Variants = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0, transition: springs.smooth },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

export const slideInFromBottom: Variants = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0, transition: springs.momentum },
  exit: { opacity: 0, y: 60, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Feed & list item animations
// ─────────────────────────────────────────────────────────────────────────────

export const feedItemVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springs.smooth,
      opacity: { duration: 0.2 },
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -10,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

/** Use with staggerChildren on the container */
export const listContainerVariants: Variants = {
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springs.smooth,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Post card interactions
// ─────────────────────────────────────────────────────────────────────────────

export const postCardVariants: Variants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.005,
    transition: { ...springs.snappy, duration: 0.15 },
  },
  pressed: {
    scale: 0.995,
    transition: { duration: 0.08 },
  },
};

/** New post arriving in feed — slides in from top with staggered reveal */
export const newPostVariants: Variants = {
  initial: {
    opacity: 0,
    height: 0,
    y: -20,
    overflow: 'hidden',
  },
  animate: {
    opacity: 1,
    height: 'auto',
    y: 0,
    transition: {
      height: { ...springs.smooth, duration: 0.4 },
      opacity: { duration: 0.3, delay: 0.1 },
      y: springs.gentle,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Like button — heart animation
// ─────────────────────────────────────────────────────────────────────────────

export const heartVariants: Variants = {
  idle: { scale: 1 },
  liked: {
    scale: [1, 1.5, 0.9, 1.15, 1],
    transition: { duration: 0.4, times: [0, 0.3, 0.5, 0.7, 1], ease: 'easeInOut' },
  },
  unliked: {
    scale: [1, 0.85, 1],
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
};

/** Floating +1 particle that shoots up on like */
export const likeParticleVariants: Variants = {
  initial: { opacity: 1, y: 0, x: 0, scale: 0.6 },
  animate: {
    opacity: 0,
    y: -40,
    x: [0, -8, 4, -4, 0],
    scale: 1.2,
    transition: { duration: 0.8, ease: [0, 0, 0.2, 1] },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Repost & bookmark
// ─────────────────────────────────────────────────────────────────────────────

export const repostVariants: Variants = {
  idle: { rotate: 0, scale: 1 },
  reposted: {
    rotate: [0, -15, 10, -5, 0],
    scale: [1, 1.3, 0.9, 1.1, 1],
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

export const bookmarkVariants: Variants = {
  idle: { y: 0, scale: 1 },
  bookmarked: {
    y: [0, -6, 2, 0],
    scale: [1, 1.25, 0.95, 1],
    transition: { duration: 0.35, ease: 'easeInOut' },
  },
  unbookmarked: {
    scale: [1, 0.8, 1],
    transition: { duration: 0.2 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Modals, sheets, drawers
// ─────────────────────────────────────────────────────────────────────────────

export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export const modalContentVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springs.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 10,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
};

export const bottomSheetVariants: Variants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: springs.momentum },
  exit: { y: '100%', transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } },
};

export const sidebarVariants: Variants = {
  initial: { x: '-100%' },
  animate: { x: 0, transition: springs.smooth },
  exit: { x: '-100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

export const rightPanelVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: springs.smooth },
  exit: { x: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Dropdowns & popovers
// ─────────────────────────────────────────────────────────────────────────────

export const dropdownVariants: Variants = {
  initial: { opacity: 0, scale: 0.92, y: -8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...springs.snappy, duration: 0.18 },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -4,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
  },
};

export const tooltipVariants: Variants = {
  initial: { opacity: 0, scale: 0.85, y: 4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.12, ease: [0, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 2,
    transition: { duration: 0.08 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

/** Toast notification banner */
export const toastVariants: Variants = {
  initial: { opacity: 0, x: 40, scale: 0.9 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: springs.snappy,
  },
  exit: {
    opacity: 0,
    x: 40,
    scale: 0.9,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

/** Notification badge pulse */
export const badgePulseVariants: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.4, 1],
    transition: { duration: 0.4, repeat: Infinity, repeatDelay: 2 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Compose / reply area
// ─────────────────────────────────────────────────────────────────────────────

export const composeExpandVariants: Variants = {
  collapsed: { height: 48, opacity: 0.8 },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { ...springs.smooth, duration: 0.35 },
      opacity: { duration: 0.2 },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Avatar & profile elements
// ─────────────────────────────────────────────────────────────────────────────

export const avatarVariants: Variants = {
  idle: { scale: 1, filter: 'brightness(1)' },
  hover: {
    scale: 1.06,
    filter: 'brightness(1.05)',
    transition: springs.snappy,
  },
  pressed: {
    scale: 0.95,
    transition: { duration: 0.08 },
  },
};

export const verifiedBadgeVariants: Variants = {
  initial: { scale: 0, rotate: -30 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: { ...springs.bouncy, delay: 0.1 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading & skeleton states
// ─────────────────────────────────────────────────────────────────────────────

export const skeletonVariants: Variants = {
  loading: {
    opacity: [0.5, 0.8, 0.5],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: { duration: 0.8, repeat: Infinity, ease: 'linear' },
  },
};

/** Data loaded — fade up from skeleton */
export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Trending / momentum indicator
// ─────────────────────────────────────────────────────────────────────────────

/** Momentum bar fill animation — triggered when score data loads */
export const momentumBarVariants: Variants = {
  initial: { scaleX: 0, originX: 0 },
  animate: (score: number) => ({
    scaleX: score / 100,
    transition: { ...springs.gentle, duration: 0.8, delay: 0.2 },
  }),
};

/** Velocity spark — pulsing glow for fast-rising posts */
export const velocitySparkVariants: Variants = {
  idle: { opacity: 0.7, scale: 1 },
  active: {
    opacity: [0.7, 1, 0.7],
    scale: [1, 1.2, 1],
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Focus mode / wellbeing
// ─────────────────────────────────────────────────────────────────────────────

export const focusModeOverlayVariants: Variants = {
  initial: { opacity: 0, backdropFilter: 'blur(0px)' },
  animate: {
    opacity: 1,
    backdropFilter: 'blur(4px)',
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: { duration: 0.3 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Presence / typing indicator
// ─────────────────────────────────────────────────────────────────────────────

export const typingDotVariants: Variants = {
  idle: { y: 0 },
  typing: {
    y: [0, -6, 0],
    transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const presenceDotVariants: Variants = {
  online: {
    scale: [1, 1.25, 1],
    opacity: [1, 0.8, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 },
  },
  offline: { scale: 1, opacity: 0.5 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility: transition presets
// ─────────────────────────────────────────────────────────────────────────────

export const transitions = {
  fast: { duration: 0.12, ease: [0.4, 0, 0.2, 1] },
  normal: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  slow: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  slowBounce: { type: 'spring', stiffness: 160, damping: 18, mass: 1 },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Stagger helpers
// ─────────────────────────────────────────────────────────────────────────────

export function staggerContainer(staggerMs = 60, delayMs = 0): Variants {
  return {
    animate: {
      transition: {
        staggerChildren: staggerMs / 1000,
        delayChildren: delayMs / 1000,
      },
    },
  };
}

export function staggerChild(fromDirection: 'up' | 'down' | 'left' | 'right' = 'up'): Variants {
  const offset = 20;
  const initial: Record<string, number> = {
    opacity: 0,
    ...(fromDirection === 'up' ? { y: offset } : {}),
    ...(fromDirection === 'down' ? { y: -offset } : {}),
    ...(fromDirection === 'left' ? { x: offset } : {}),
    ...(fromDirection === 'right' ? { x: -offset } : {}),
  };

  return {
    initial,
    animate: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: springs.smooth,
    },
  };
}

/**
 * Responsive breakpoints for WriteNow layout system.
 *
 * Why: Centralize breakpoint values to ensure consistency across CSS media queries,
 * JavaScript resize handlers, and Tailwind classes.
 *
 * Breakpoint strategy:
 * - mobile: < 768px (collapsed sidebar, overlay AI panel)
 * - tablet: 768px - 1279px (collapsed sidebar by default, inline AI panel)
 * - desktop: >= 1280px (full layout)
 */

export const BREAKPOINTS = {
  /** Below this: mobile layout with overlays */
  mobile: 768,
  /** Below this: tablet layout with collapsed sidebar */
  tablet: 1280,
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Get current breakpoint based on window width.
 */
export function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

/**
 * Check if current width is at or above a breakpoint.
 */
export function isAtLeast(width: number, breakpoint: Breakpoint): boolean {
  switch (breakpoint) {
    case 'mobile':
      return width >= BREAKPOINTS.mobile;
    case 'tablet':
      return width >= BREAKPOINTS.tablet;
    case 'desktop':
      return width >= BREAKPOINTS.tablet; // desktop starts at tablet threshold
  }
}

/**
 * CSS media query strings for use in JS or styled-components.
 */
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.mobile - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.tablet}px)`,
  /** At least tablet size */
  notMobile: `(min-width: ${BREAKPOINTS.mobile}px)`,
  /** At least desktop size */
  notTablet: `(min-width: ${BREAKPOINTS.tablet}px)`,
} as const;

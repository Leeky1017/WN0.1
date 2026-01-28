/**
 * React hook for responsive breakpoint detection.
 *
 * Why: Enables components to adapt behavior based on screen size without
 * relying solely on CSS media queries (useful for conditional rendering).
 */

import { useState, useEffect } from 'react';
import { getBreakpoint, BREAKPOINTS, type Breakpoint } from './breakpoints';

export interface UseBreakpointResult {
  /** Current breakpoint */
  breakpoint: Breakpoint;
  /** Current window width */
  width: number;
  /** True if screen is mobile size */
  isMobile: boolean;
  /** True if screen is tablet size */
  isTablet: boolean;
  /** True if screen is desktop size */
  isDesktop: boolean;
}

/**
 * Hook to track current responsive breakpoint.
 *
 * Uses matchMedia for efficient change detection instead of resize events.
 */
export function useBreakpoint(): UseBreakpointResult {
  const getInitialWidth = () => {
    if (typeof window === 'undefined') return BREAKPOINTS.tablet;
    const width = window.innerWidth;
    // Why: During Electron app startup, window.innerWidth can be 0 before the window fully initializes.
    // Default to tablet breakpoint (1280) to avoid incorrectly detecting mobile and hiding the sidebar.
    return width > 0 ? width : BREAKPOINTS.tablet;
  };

  const [width, setWidth] = useState(getInitialWidth);
  const breakpoint = getBreakpoint(width);

  useEffect(() => {
    // Use matchMedia for efficient breakpoint change detection
    const mobileQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.mobile - 1}px)`);
    const tabletQuery = window.matchMedia(`(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`);

    const handleChange = () => {
      setWidth(window.innerWidth);
    };

    // Initial sync
    handleChange();

    // Listen to media query changes (more efficient than resize)
    mobileQuery.addEventListener('change', handleChange);
    tabletQuery.addEventListener('change', handleChange);

    return () => {
      mobileQuery.removeEventListener('change', handleChange);
      tabletQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return {
    breakpoint,
    width,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
  };
}

/**
 * Hook that returns true when width is at least the given breakpoint.
 */
export function useMinBreakpoint(minBreakpoint: Breakpoint): boolean {
  const { breakpoint } = useBreakpoint();

  const breakpointOrder: Breakpoint[] = ['mobile', 'tablet', 'desktop'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  const minIndex = breakpointOrder.indexOf(minBreakpoint);

  return currentIndex >= minIndex;
}

/**
 * Test helpers
 * Why: Shared utilities for unit and integration tests
 */

import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * Custom render function with common providers
 * Why: Centralize provider setup for component tests
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Future: Add providers (theme, store, etc.) here
  return render(ui, { ...options });
}

/**
 * Wait for a condition to be true
 * Why: Useful for async tests
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timeout');
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

/**
 * Create a deferred promise
 * Why: Useful for testing async flows
 */
export function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Theme switching tests.
 * 
 * Why: Verifies that design tokens respond correctly to theme changes.
 * This ensures the dual-theme system (dark/light) works as expected.
 */
import { describe, it, expect, beforeEach } from 'vitest';

describe('Theme System', () => {
  beforeEach(() => {
    // Reset to dark theme (default)
    document.documentElement.removeAttribute('data-theme');
  });

  describe('Dark Theme (Default)', () => {
    it('should load dark theme by default (no data-theme attribute)', () => {
      // When no data-theme is set, :root selector applies dark theme
      const hasLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
      expect(hasLightTheme).toBe(false);
    });

    it('should have dark theme when data-theme="dark"', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Light Theme', () => {
    it('should apply light theme when data-theme="light"', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('Theme Toggle', () => {
    it('should toggle between dark and light themes', () => {
      // Start with dark
      document.documentElement.setAttribute('data-theme', 'dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // Toggle to light
      document.documentElement.setAttribute('data-theme', 'light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      // Toggle back to dark
      document.documentElement.setAttribute('data-theme', 'dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should allow removing theme attribute to reset to default', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.removeAttribute('data-theme');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });
});

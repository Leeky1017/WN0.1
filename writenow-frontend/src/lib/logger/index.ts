/**
 * WriteNow Unified Logger
 *
 * Why: Centralize logging for consistency, filtering, and production safety.
 * - Structured log format with prefixes
 * - Level-based filtering
 * - Production-safe (console.log/warn stripped by esbuild)
 * - Error logs preserved for observability
 *
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('RPC', 'Connecting to', url);
 * logger.info('Editor', 'File saved');
 * logger.warn('Settings', 'Invalid value, using default');
 * logger.error('AI', 'Stream failed', error);
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory =
  | 'App'
  | 'RPC'
  | 'Editor'
  | 'AI'
  | 'Settings'
  | 'Files'
  | 'Layout'
  | 'Memory'
  | 'Skills'
  | 'Search'
  | 'Export'
  | 'Theme'
  | string;

interface LoggerConfig {
  /** Minimum log level (default: 'info' in prod, 'debug' in dev) */
  minLevel: LogLevel;
  /** Enable/disable logging entirely */
  enabled: boolean;
  /** Categories to filter (empty = all) */
  categories: Set<LogCategory> | null;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig = {
    minLevel: typeof __DEV__ !== 'undefined' && __DEV__ ? 'debug' : 'info',
    enabled: true,
    categories: null,
  };

  /**
   * Configure the logger.
   */
  configure(options: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...options };
  }

  /**
   * Set minimum log level.
   */
  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  /**
   * Enable/disable specific categories.
   * Pass null to enable all categories.
   */
  setCategories(categories: LogCategory[] | null): void {
    this.config.categories = categories ? new Set(categories) : null;
  }

  /**
   * Check if a log should be output based on level and category.
   */
  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    if (!this.config.enabled) return false;
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) return false;
    if (this.config.categories && !this.config.categories.has(category)) return false;
    return true;
  }

  /**
   * Format the log prefix.
   */
  private formatPrefix(level: LogLevel, category: LogCategory): string {
    const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
    return `[${timestamp}] [${level.toUpperCase()}] [${category}]`;
  }

  /**
   * Debug level log - stripped in production.
   */
  debug(category: LogCategory, message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug', category)) return;
    console.debug(this.formatPrefix('debug', category), message, ...args);
  }

  /**
   * Info level log - stripped in production.
   */
  info(category: LogCategory, message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info', category)) return;
    console.log(this.formatPrefix('info', category), message, ...args);
  }

  /**
   * Warning level log - stripped in production.
   */
  warn(category: LogCategory, message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn', category)) return;
    console.warn(this.formatPrefix('warn', category), message, ...args);
  }

  /**
   * Error level log - PRESERVED in production for observability.
   * Note: console.error is NOT stripped by esbuild pure settings.
   */
  error(category: LogCategory, message: string, ...args: unknown[]): void {
    if (!this.shouldLog('error', category)) return;
    console.error(this.formatPrefix('error', category), message, ...args);
  }

  /**
   * Create a scoped logger for a specific category.
   */
  scope(category: LogCategory): ScopedLogger {
    return new ScopedLogger(this, category);
  }
}

/**
 * Scoped logger for a specific category.
 */
class ScopedLogger {
  private readonly parent: Logger;
  private readonly category: LogCategory;

  constructor(parent: Logger, category: LogCategory) {
    this.parent = parent;
    this.category = category;
  }

  debug(message: string, ...args: unknown[]): void {
    this.parent.debug(this.category, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.parent.info(this.category, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.parent.warn(this.category, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.parent.error(this.category, message, ...args);
  }
}

/** Singleton logger instance */
export const logger = new Logger();

/** Pre-defined scoped loggers for common categories */
export const loggers = {
  app: logger.scope('App'),
  rpc: logger.scope('RPC'),
  editor: logger.scope('Editor'),
  ai: logger.scope('AI'),
  settings: logger.scope('Settings'),
  files: logger.scope('Files'),
  layout: logger.scope('Layout'),
  memory: logger.scope('Memory'),
  skills: logger.scope('Skills'),
  search: logger.scope('Search'),
  export: logger.scope('Export'),
  theme: logger.scope('Theme'),
} as const;

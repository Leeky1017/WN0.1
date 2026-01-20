export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(module: string, message: string, details?: object): void;
  info(module: string, message: string, details?: object): void;
  warn(module: string, message: string, details?: object): void;
  error(module: string, message: string, details?: object): void;
}

export type RendererLogPayload = {
  level: LogLevel;
  module: string;
  message: string;
  details?: unknown;
  ts: number;
};

export type RendererLogSink = {
  send: (payload: RendererLogPayload) => void;
};

function createDefaultSink(): RendererLogSink {
  return {
    send: (payload) => {
      try {
        window.writenow?.send?.('app:renderer-log', payload);
      } catch {
        // ignore
      }
    },
  };
}

function consoleWrite(level: LogLevel, moduleName: string, message: string, details?: unknown) {
  const prefix = `[${moduleName}] ${message}`;
  if (typeof details === 'undefined') {
    console[level](prefix);
    return;
  }
  console[level](prefix, details);
}

export function createRendererLogger(options: { isDev: boolean; sink?: RendererLogSink }): Logger {
  const sink = options.sink ?? createDefaultSink();

  function log(level: LogLevel, moduleName: string, message: string, details?: unknown) {
    if (options.isDev) {
      consoleWrite(level, moduleName, message, details);
      return;
    }

    if (level === 'error') {
      sink.send({
        level,
        module: moduleName,
        message,
        details,
        ts: Date.now(),
      });
    }
  }

  return {
    debug: (moduleName, message, details) => log('debug', moduleName, message, details),
    info: (moduleName, message, details) => log('info', moduleName, message, details),
    warn: (moduleName, message, details) => log('warn', moduleName, message, details),
    error: (moduleName, message, details) => log('error', moduleName, message, details),
  };
}

export const logger: Logger = createRendererLogger({ isDev: import.meta.env.DEV });

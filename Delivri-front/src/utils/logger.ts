type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const resolveLogLevel = (): LogLevel => {
  const configured = import.meta.env.VITE_LOG_LEVEL?.toLowerCase();

  if (configured === 'debug' || configured === 'info' || configured === 'warn' || configured === 'error') {
    return configured;
  }

  return import.meta.env.DEV ? 'debug' : 'info';
};

const MIN_LEVEL = resolveLogLevel();

const shouldLog = (level: LogLevel): boolean => LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];

const prefixForLevel = (level: LogLevel): string => `[Delivri:${level.toUpperCase()}]`;

const logWithConsole = (level: LogLevel, message: string, metadata?: unknown): void => {
  if (!shouldLog(level)) {
    return;
  }

  const prefix = prefixForLevel(level);
  if (metadata === undefined) {
    console[level](`${prefix} ${message}`);
    return;
  }

  console[level](`${prefix} ${message}`, metadata);
};

export const logger = {
  debug: (message: string, metadata?: unknown): void => {
    logWithConsole('debug', message, metadata);
  },
  info: (message: string, metadata?: unknown): void => {
    logWithConsole('info', message, metadata);
  },
  warn: (message: string, metadata?: unknown): void => {
    logWithConsole('warn', message, metadata);
  },
  error: (message: string, metadata?: unknown): void => {
    logWithConsole('error', message, metadata);
  },
};

export default logger;

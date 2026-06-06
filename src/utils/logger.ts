import pino from 'pino';

// Uses process.env directly instead of @/lib/env to avoid a circular
// dependency: logger is imported by nearly every server-side module
// (including those that run during tests), and @/lib/env triggers
// validation that requires all env vars to be present — which isn't
// the case in the test environment. LOG_LEVEL is optional anyway.
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

/**
 * Creates a child logger with module context attached.
 * Usage: const log = createLogger('my-module');
 *        log.info({ id }, 'Doing something');
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

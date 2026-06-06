import type { Logger } from 'pino';

const GENERIC_MESSAGE = 'An unexpected error occurred';

export interface ErrorContext {
  operation?: string;
  resourceId?: string | number;
}

/**
 * Returns a sanitized error message suitable for client responses.
 * In production: logs full error with context, returns generic message.
 * In non-production: returns the original error message.
 */
export function sanitizeErrorMessage(
  error: unknown,
  logger?: Logger,
  context?: ErrorContext
): string {
  if (process.env.NODE_ENV === 'production') {
    if (logger) {
      logger.error(
        {
          err: error instanceof Error ? error : undefined,
          ...(context?.operation && { operation: context.operation }),
          ...(context?.resourceId !== undefined && {
            resourceId: context.resourceId,
          }),
        },
        GENERIC_MESSAGE
      );
    }
    return GENERIC_MESSAGE;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

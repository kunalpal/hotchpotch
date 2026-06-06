import { getAuthenticatedUser } from '@/utils/auth';
import { sanitizeErrorMessage } from '@/lib/security/error-sanitizer';
import { createLogger } from '@/utils/logger';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import type { ActionResult, ErrorCode } from '@/lib/actions/types';

type AuthenticatedUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

const log = createLogger('action');

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
];

function sanitizeInput(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input;
  const sanitized = { ...(input as Record<string, unknown>) };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) sanitized[field] = '[REDACTED]';
  }
  return sanitized;
}

export function classifyError(error: unknown): ErrorCode {
  if (error instanceof z.ZodError) {
    return 'VALIDATION_ERROR';
  }

  if (error instanceof Error) {
    const msg = error.message;
    if (msg === 'Unauthorized') return 'UNAUTHORIZED';
    if (msg === 'Forbidden: User is not allowlisted') return 'FORBIDDEN';
    if (/not found/i.test(msg)) return 'NOT_FOUND';
  }

  return 'INTERNAL_ERROR';
}

function formatZodError(error: z.ZodError): string {
  const fieldErrors = error.issues.map(
    (e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`
  );
  return `Validation failed: ${fieldErrors.join('; ')}`;
}

/**
 * Creates an authenticated server action with standardized error handling.
 *
 * Wraps action logic with:
 * - Authentication check via getAuthenticatedUser()
 * - Optional Zod schema validation
 * - Automatic path/tag revalidation on success
 * - Structured error codes and logging
 *
 * @example
 * const createItemAction = createAction({
 *   name: 'createItem',
 *   schema: createItemSchema,
 *   revalidatePaths: ['/items'],
 *   handler: async (input, user) => {
 *     return await db.insert(items).values({ ...input, userId: user.id });
 *   },
 * });
 */
export function createAction<TSchema extends z.ZodType, TOutput>(config: {
  name?: string;
  module?: string;
  schema: TSchema;
  revalidatePaths?: string[];
  revalidateTags?: string[] | ((input: z.output<TSchema>) => string[]);
  handler: (
    input: z.output<TSchema>,
    user: AuthenticatedUser
  ) => Promise<TOutput>;
}): (input: z.input<TSchema>) => Promise<ActionResult<TOutput>>;

export function createAction<TInput, TOutput>(config: {
  name?: string;
  module?: string;
  schema?: never;
  revalidatePaths?: string[];
  revalidateTags?: string[] | ((input: TInput) => string[]);
  handler: (input: TInput, user: AuthenticatedUser) => Promise<TOutput>;
}): (input: TInput) => Promise<ActionResult<TOutput>>;

export function createAction(config: {
  name?: string;
  module?: string;
  schema?: z.ZodType;
  revalidatePaths?: string[];
  revalidateTags?: string[] | ((input: unknown) => string[]);
  handler: (input: unknown, user: AuthenticatedUser) => Promise<unknown>;
}) {
  return async (input: unknown): Promise<ActionResult<unknown>> => {
    const actionLog = config.module ? createLogger(config.module) : log;
    const actionName = config.name ?? 'unknown';
    const startTime = Date.now();

    try {
      const user = await getAuthenticatedUser();

      const validatedInput = config.schema ? config.schema.parse(input) : input;

      actionLog.info(
        {
          action: actionName,
          userId: user.id,
          input: sanitizeInput(validatedInput),
        },
        'Action started'
      );

      const result = await config.handler(validatedInput, user);

      if (config.revalidatePaths) {
        config.revalidatePaths.forEach((path) => revalidatePath(path));
      }

      if (config.revalidateTags) {
        const tags =
          typeof config.revalidateTags === 'function'
            ? config.revalidateTags(validatedInput)
            : config.revalidateTags;
        tags.forEach((tag) => revalidateTag(tag, 'default'));
      }

      const durationMs = Date.now() - startTime;
      actionLog.info(
        { action: actionName, userId: user.id, durationMs },
        'Action completed'
      );

      return { success: true, data: result };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const code = classifyError(error);
      const message =
        error instanceof z.ZodError
          ? formatZodError(error)
          : sanitizeErrorMessage(error, undefined, {
              operation: actionName,
            });

      actionLog.error(
        { action: actionName, err: error, code, durationMs },
        'Action failed'
      );

      return { success: false, error: message, code };
    }
  };
}

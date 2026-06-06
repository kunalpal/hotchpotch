'use client';

import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/actions/types';
import { unwrapActionResult } from '@/lib/actions/types';

/**
 * Configuration for creating a mutation hook
 */
type MutationConfig<TInput, TOutput> = {
  /** The mutation function that calls the server action */
  mutationFn: (input: TInput) => Promise<ActionResult<TOutput>>;
  /** Query keys to invalidate on success */
  invalidateKeys?: QueryKey[];
  /** Success message or function to generate message from result */
  successMessage?: string | ((data: TOutput, variables: TInput) => string);
  /** Error message prefix (error details will be appended) */
  errorMessage?: string;
};

/**
 * Configuration for creating a space-scoped mutation hook
 */
type SpaceMutationConfig<TInput, TOutput> = Omit<
  MutationConfig<TInput, TOutput>,
  'invalidateKeys'
> & {
  /** Function to generate invalidation keys. Receives spaceId plus the mutation
   *  variables and response data so callers can do targeted invalidation. */
  getInvalidateKeys: (
    spaceId: number,
    variables: TInput,
    data: TOutput
  ) => QueryKey[];
};

/**
 * Creates a standardized mutation hook with toast notifications.
 *
 * Features:
 * - Automatic unwrapping of ActionResult
 * - Cache invalidation on success
 * - Success toast with configurable message
 * - Error toast with error details
 *
 * @template TInput - The input type for the mutation
 * @template TOutput - The output type from the mutation
 * @param config - Configuration object for the mutation
 * @returns A React hook that returns a mutation object
 *
 * @example
 * const useCreateBookmark = createMutationHook({
 *   mutationFn: createBookmarkAction,
 *   invalidateKeys: [bookmarkKeys.all],
 *   successMessage: 'Bookmark created',
 *   errorMessage: 'Failed to create bookmark',
 * });
 *
 * // In component:
 * const { mutate } = useCreateBookmark();
 * mutate({ url: 'https://example.com', title: 'Example' });
 */
export function createMutationHook<TInput, TOutput>(
  config: MutationConfig<TInput, TOutput>
) {
  return function useMutationHook() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (input: TInput) => {
        const result = await config.mutationFn(input);
        return unwrapActionResult(result);
      },
      onSuccess: (data, variables) => {
        if (config.invalidateKeys) {
          config.invalidateKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }

        const message =
          typeof config.successMessage === 'function'
            ? config.successMessage(data, variables)
            : config.successMessage;

        if (message) {
          toast.success(message, {
            description: 'Your changes have been saved.',
          });
        }
      },
      onError: (error: Error) => {
        toast.error(config.errorMessage || 'Operation failed', {
          description: error.message,
        });
      },
    });
  };
}

/**
 * Creates a mutation hook that requires spaceId for cache invalidation.
 *
 * Use this when the mutation affects space-scoped data and you need
 * to invalidate queries specific to that space.
 *
 * @template TInput - The input type for the mutation
 * @template TOutput - The output type from the mutation
 * @param config - Configuration object for the mutation
 * @returns A React hook that accepts spaceId and returns a mutation object
 *
 * @example
 * const useCreateTracker = createSpaceMutationHook({
 *   mutationFn: createTrackerAction,
 *   getInvalidateKeys: (spaceId) => [trackerKeys.list({ spaceId })],
 *   successMessage: (data) => `${data.name} created`,
 *   errorMessage: 'Failed to create tracker',
 * });
 *
 * // In component:
 * const { mutate } = useCreateTracker(spaceId);
 * mutate({ name: 'My Tracker', type: 'COUNTER' });
 */
export function createSpaceMutationHook<TInput, TOutput>(
  config: SpaceMutationConfig<TInput, TOutput>
) {
  return function useMutationHook(spaceId: number) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (input: TInput) => {
        const result = await config.mutationFn(input);
        return unwrapActionResult(result);
      },
      onSuccess: (data, variables) => {
        const keys = config.getInvalidateKeys(spaceId, variables, data);
        keys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });

        const message =
          typeof config.successMessage === 'function'
            ? config.successMessage(data, variables)
            : config.successMessage;

        if (message) {
          toast.success(message, {
            description: 'Your changes have been saved.',
          });
        }
      },
      onError: (error: Error) => {
        toast.error(config.errorMessage || 'Operation failed', {
          description: error.message,
        });
      },
    });
  };
}

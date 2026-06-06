'use client';

import { useQuery, QueryKey } from '@tanstack/react-query';

/**
 * Configuration for creating a query hook
 */
type QueryConfig<TParams, TOutput> = {
  /** Function to generate the query key from params */
  queryKey: (params: TParams) => QueryKey;
  /** Function to fetch the data */
  queryFn: (params: TParams) => Promise<TOutput>;
  /** Optional function to determine if query should be enabled */
  enabled?: (params: TParams) => boolean;
};

/**
 * Options that can be passed when using the generated query hook
 */
type QueryHookOptions<TOutput> = {
  /** Initial data for SSR hydration */
  initialData?: TOutput;
  /** Override the enabled state at the call site */
  enabled?: boolean;
};

/**
 * Creates a standardized query hook.
 *
 * Features:
 * - Consistent query key generation
 * - Support for enabled conditions
 * - Support for initial data (SSR hydration)
 * - Full TypeScript type inference
 *
 * @template TParams - The parameters type for the query
 * @template TOutput - The output type from the query
 * @param config - Configuration object for the query
 * @returns A React hook that accepts params and options
 *
 * @example
 * const useBookmarks = createQueryHook({
 *   queryKey: (params) => bookmarkKeys.list(params),
 *   queryFn: (params) => getBookmarksAction(params),
 *   enabled: (params) => !!params.spaceId,
 * });
 *
 * // In component:
 * const { data, isLoading } = useBookmarks(
 *   { spaceId: 1, search: 'test' },
 *   { initialData: serverData }
 * );
 */
export function createQueryHook<TParams, TOutput>(
  config: QueryConfig<TParams, TOutput>
) {
  return function useQueryHook(
    params: TParams,
    options?: QueryHookOptions<TOutput>
  ) {
    return useQuery({
      queryKey: config.queryKey(params),
      queryFn: () => config.queryFn(params),
      enabled:
        (options?.enabled ?? true) &&
        (config.enabled ? config.enabled(params) : true),
      initialData: options?.initialData,
    });
  };
}

/**
 * Configuration for creating a space-scoped query hook
 */
type SpaceQueryConfig<TParams extends { spaceId: number }, TOutput> = Omit<
  QueryConfig<TParams, TOutput>,
  'enabled'
> & {
  /** Additional enabled condition (spaceId check is automatic) */
  enabled?: (params: TParams) => boolean;
};

/**
 * Creates a query hook that automatically checks for valid spaceId.
 *
 * This is a convenience wrapper around createQueryHook that:
 * - Automatically disables the query when spaceId is falsy
 * - Combines with any additional enabled conditions
 *
 * @template TParams - The parameters type (must include spaceId)
 * @template TOutput - The output type from the query
 * @param config - Configuration object for the query
 * @returns A React hook that accepts params and options
 *
 * @example
 * const useTrackers = createSpaceQueryHook({
 *   queryKey: (params) => trackerKeys.list(params),
 *   queryFn: (params) => getTrackersAction(params),
 * });
 *
 * // In component (query auto-disabled if spaceId is 0 or undefined):
 * const { data } = useTrackers({ spaceId, type: 'COUNTER' });
 */
export function createSpaceQueryHook<
  TParams extends { spaceId: number },
  TOutput,
>(config: SpaceQueryConfig<TParams, TOutput>) {
  return createQueryHook({
    ...config,
    enabled: (params) => {
      const hasSpaceId = !!params.spaceId;
      const additionalEnabled = config.enabled ? config.enabled(params) : true;
      return hasSpaceId && additionalEnabled;
    },
  });
}

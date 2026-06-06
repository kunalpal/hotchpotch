/**
 * Query Key Factory
 *
 * Provides standardized query key generation for React Query.
 * Ensures consistent key patterns across all modules for predictable cache invalidation.
 */

/**
 * Query key factory type for a module.
 * Provides methods for generating consistent query keys.
 */
export type QueryKeyFactory<TModule extends string> = {
  /** Base key for all queries in this module */
  all: readonly [TModule];
  /** Key for list queries */
  lists: () => readonly [TModule, 'list'];
  /** Key for filtered list queries */
  list: (
    filters: Record<string, unknown>
  ) => readonly [TModule, 'list', Record<string, unknown>];
  /** Key for detail queries */
  details: () => readonly [TModule, 'detail'];
  /** Key for a specific entity detail */
  detail: (id: number) => readonly [TModule, 'detail', number];
};

/**
 * Creates a standardized query key factory for a module.
 *
 * The generated keys follow the pattern:
 * - all: [module]
 * - lists(): [module, 'list']
 * - list(filters): [module, 'list', filters]
 * - details(): [module, 'detail']
 * - detail(id): [module, 'detail', id]
 *
 * @template TModule - The module name type
 * @param module - The module name (e.g., 'bookmarks', 'files')
 * @returns A query key factory object
 *
 * @example
 * const bookmarkKeys = createQueryKeys('bookmarks');
 * bookmarkKeys.all // ['bookmarks']
 * bookmarkKeys.lists() // ['bookmarks', 'list']
 * bookmarkKeys.list({ spaceId: 1 }) // ['bookmarks', 'list', { spaceId: 1 }]
 * bookmarkKeys.detail(123) // ['bookmarks', 'detail', 123]
 */
export function createQueryKeys<TModule extends string>(
  module: TModule
): QueryKeyFactory<TModule> {
  return {
    all: [module] as const,
    lists: () => [module, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [module, 'list', filters] as const,
    details: () => [module, 'detail'] as const,
    detail: (id: number) => [module, 'detail', id] as const,
  };
}

export const profileKeys = createQueryKeys('profile');

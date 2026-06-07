/**
 * Topological sort utilities for module dependency resolution.
 * Uses Kahn's algorithm to compute dependency-safe execution order.
 */

/** Minimal interface for modules that can be topologically sorted. */
export interface TopoSortModule {
  name: string;
  dependencies: string[];
}

/**
 * Returns module names in dependency-safe order using Kahn's algorithm.
 * Every module appears after all of its declared dependencies.
 *
 * @throws Error if a cycle is detected, listing the involved modules.
 */
export function topoSort(modules: TopoSortModule[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const moduleNames = new Set<string>();

  // Initialise nodes
  for (const mod of modules) {
    moduleNames.add(mod.name);
    if (!inDegree.has(mod.name)) inDegree.set(mod.name, 0);
    if (!adjacency.has(mod.name)) adjacency.set(mod.name, []);
  }

  // Build edges: dependency → dependent
  for (const mod of modules) {
    for (const dep of mod.dependencies) {
      if (!moduleNames.has(dep)) {
        throw new Error(
          `Module "${mod.name}" depends on unknown module "${dep}"`
        );
      }
      adjacency.get(dep)!.push(mod.name);
      inDegree.set(mod.name, (inDegree.get(mod.name) ?? 0) + 1);
    }
  }

  // Seed the queue with zero-in-degree nodes
  const queue: string[] = [];
  inDegree.forEach((degree, name) => {
    if (degree === 0) queue.push(name);
  });

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbour of adjacency.get(current) ?? []) {
      const newDegree = inDegree.get(neighbour)! - 1;
      inDegree.set(neighbour, newDegree);
      if (newDegree === 0) queue.push(neighbour);
    }
  }

  if (sorted.length !== moduleNames.size) {
    const cycleModules = Array.from(moduleNames).filter(
      (name) => !sorted.includes(name)
    );
    throw new Error(`Cycle detected among modules: ${cycleModules.join(', ')}`);
  }

  return sorted;
}

/**
 * Returns module names in reverse dependency order (teardown order).
 * Every module appears before all of its declared dependencies.
 */
export function reverseTopoSort(modules: TopoSortModule[]): string[] {
  return topoSort(modules).reverse();
}

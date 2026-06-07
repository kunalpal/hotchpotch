/**
 * Module registry: declarative configuration of all seeder modules,
 * their dependencies, and their bootstrap/teardown functions.
 */

import { createDb } from '../connection';
import { topoSort, reverseTopoSort } from './topo-sort';

import { bootstrapUsers } from './users-bootstrap';
import { bootstrapChat } from './chat-bootstrap';
import { teardownChat } from './chat-teardown';

export type DbInstance = ReturnType<typeof createDb>['db'];

export interface SeedResult {
  inserted: number;
  skipped: number;
}

export interface ModuleDefinition {
  name: string;
  description: string;
  dependencies: string[];
  bootstrap: (db: DbInstance) => Promise<SeedResult>;
  teardown: (db: DbInstance, dryRun: boolean) => Promise<void>;
}

export const moduleRegistry: ModuleDefinition[] = [
  {
    name: 'users',
    description: 'Development user accounts',
    dependencies: [],
    bootstrap: bootstrapUsers,
    teardown: async () => {},
  },
  {
    name: 'chat',
    description: 'Chat conversations and messages',
    dependencies: ['users'],
    bootstrap: bootstrapChat,
    teardown: teardownChat,
  },
];

export function getModule(name: string): ModuleDefinition | undefined {
  return moduleRegistry.find((m) => m.name === name);
}

export function getModulesInOrder(): ModuleDefinition[] {
  return topoSort(moduleRegistry).map((name) => getModule(name)!);
}

export function getModulesInReverseOrder(): ModuleDefinition[] {
  return reverseTopoSort(moduleRegistry).map((name) => getModule(name)!);
}

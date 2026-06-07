#!/usr/bin/env node

/**
 * Hotchpotch Database CLI
 *
 * Registry-driven CLI that dynamically generates bootstrap, teardown,
 * and reset commands from the module registry.
 *
 * Usage:
 *   npx tsx src/db/scripts/cli.ts [command] [options]
 *   npm run db:seed bootstrap all
 *   npm run db:seed teardown chat --dry-run
 *   npm run db:seed reset all
 */

import { loadEnvConfig } from '@next/env';
import { Command } from 'commander';
import { logger, Logger } from './logger';
import {
  getSharedConnection,
  closeSharedConnection,
  healthCheck,
} from './connection-manager';
import {
  moduleRegistry,
  getModulesInOrder,
  getModulesInReverseOrder,
} from './module-registry';

loadEnvConfig(process.cwd());

const program = new Command();

program
  .name('hotchpotch-db-cli')
  .description(
    'CLI for managing Hotchpotch database bootstrap and teardown operations'
  )
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose output');

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const bootstrapCmd = program
  .command('bootstrap')
  .description('Bootstrap database with sample data');

bootstrapCmd
  .command('all')
  .description('Bootstrap all modules in dependency order')
  .action(async () => {
    Logger.setGlobalVerbose(program.opts().verbose || false);
    try {
      await healthCheck();
      const { db } = getSharedConnection();
      const results: Array<{
        module: string;
        inserted: number;
        skipped: number;
      }> = [];

      for (const mod of getModulesInOrder()) {
        logger.startOperation(`${mod.name} bootstrap`);
        const result = await mod.bootstrap(db);
        logger.completeOperation(`${mod.name} bootstrap`);
        results.push({ module: mod.name, ...result });

        if (result.inserted === 0 && result.skipped === 0) {
          logger.warn(
            `${mod.name}: 0 inserted, 0 skipped — possible configuration issue`
          );
        }
      }

      logger.newline();
      logger.table(results);
      logger.success('All bootstrap operations completed');
    } catch (error) {
      logger.failOperation('bootstrap', (error as Error).message);
      process.exit(1);
    } finally {
      await closeSharedConnection();
    }
  });

for (const mod of moduleRegistry) {
  bootstrapCmd
    .command(mod.name)
    .description(`Bootstrap ${mod.description}`)
    .action(async () => {
      Logger.setGlobalVerbose(program.opts().verbose || false);
      try {
        await healthCheck();
        const { db } = getSharedConnection();
        logger.startOperation(`${mod.name} bootstrap`);
        const result = await mod.bootstrap(db);
        logger.success(
          `${mod.name} bootstrap: ${result.inserted} inserted, ${result.skipped} skipped`
        );
      } catch (error) {
        logger.failOperation(`${mod.name} bootstrap`, (error as Error).message);
        process.exit(1);
      } finally {
        await closeSharedConnection();
      }
    });
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

const teardownCmd = program
  .command('teardown')
  .description('Remove bootstrapped data from database')
  .option('--dry-run', 'Show what would be deleted without actually deleting');

teardownCmd
  .command('all')
  .description('Teardown all modules in reverse dependency order')
  .action(async () => {
    Logger.setGlobalVerbose(program.opts().verbose || false);
    const dryRun = teardownCmd.opts().dryRun || false;
    try {
      await healthCheck();
      const { db } = getSharedConnection();

      for (const mod of getModulesInReverseOrder()) {
        logger.startOperation(`${mod.name} teardown`);
        await mod.teardown(db, dryRun);
        logger.completeOperation(`${mod.name} teardown`);
      }

      logger.success('All teardown operations completed');
    } catch (error) {
      logger.failOperation('teardown', (error as Error).message);
      process.exit(1);
    } finally {
      await closeSharedConnection();
    }
  });

for (const mod of moduleRegistry) {
  teardownCmd
    .command(mod.name)
    .description(`Teardown ${mod.description}`)
    .action(async () => {
      Logger.setGlobalVerbose(program.opts().verbose || false);
      const dryRun = teardownCmd.opts().dryRun || false;
      try {
        await healthCheck();
        const { db } = getSharedConnection();
        logger.startOperation(`${mod.name} teardown`);
        await mod.teardown(db, dryRun);
        logger.success(`${mod.name} teardown completed`);
      } catch (error) {
        logger.failOperation(`${mod.name} teardown`, (error as Error).message);
        process.exit(1);
      } finally {
        await closeSharedConnection();
      }
    });
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

const resetCmd = program
  .command('reset')
  .description('Reset database modules by tearing down and then bootstrapping')
  .option('--dry-run', 'Show what would be deleted without actually deleting');

resetCmd
  .command('all')
  .description('Reset all modules')
  .action(async () => {
    Logger.setGlobalVerbose(program.opts().verbose || false);
    const dryRun = resetCmd.opts().dryRun || false;
    try {
      await healthCheck();
      const { db } = getSharedConnection();

      for (const mod of getModulesInReverseOrder()) {
        logger.startOperation(`${mod.name} teardown`);
        await mod.teardown(db, dryRun);
        logger.completeOperation(`${mod.name} teardown`);
      }

      for (const mod of getModulesInOrder()) {
        logger.startOperation(`${mod.name} bootstrap`);
        await mod.bootstrap(db);
        logger.completeOperation(`${mod.name} bootstrap`);
      }

      logger.success('All reset operations completed');
    } catch (error) {
      logger.failOperation('reset all', (error as Error).message);
      process.exit(1);
    } finally {
      await closeSharedConnection();
    }
  });

for (const mod of moduleRegistry) {
  resetCmd
    .command(mod.name)
    .description(`Reset ${mod.description}`)
    .action(async () => {
      Logger.setGlobalVerbose(program.opts().verbose || false);
      const dryRun = resetCmd.opts().dryRun || false;
      try {
        await healthCheck();
        const { db } = getSharedConnection();
        logger.startOperation(`${mod.name} reset`);
        await mod.teardown(db, dryRun);
        await mod.bootstrap(db);
        logger.success(`${mod.name} reset completed`);
      } catch (error) {
        logger.failOperation(`${mod.name} reset`, (error as Error).message);
        process.exit(1);
      } finally {
        await closeSharedConnection();
      }
    });
}

// ---------------------------------------------------------------------------
// Global error handling
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
process.on('unhandledRejection', (reason, _promise) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

program.parse();

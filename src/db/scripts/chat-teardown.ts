/**
 * Teardown script for the Chat module
 *
 * Truncates chat.message then chat.conversation.
 * Does NOT touch the auth.user table.
 */

import { loadEnvConfig } from '@next/env';
import { createDb } from '../connection';
import { sql } from 'drizzle-orm';
import { logger } from './logger';
import type { DbInstance } from './module-registry';

// message first (FK references conversation); CASCADE would handle it but being explicit
const CHAT_TABLES = ['chat.message', 'chat.conversation'];

async function getRowCount(db: DbInstance, tableName: string): Promise<number> {
  const result = await db.execute(
    sql.raw(`SELECT COUNT(*) AS count FROM "${tableName}"`)
  );
  return Number((result.rows[0] as { count: string }).count);
}

export async function teardownChat(
  db: DbInstance,
  dryRun = false
): Promise<void> {
  if (dryRun) {
    logger.info('Dry run mode — no data will be deleted');
  }

  for (const tableName of CHAT_TABLES) {
    try {
      const count = await getRowCount(db, tableName);
      if (count > 0) {
        logger.info(`${tableName}: ${count} rows`);
      } else {
        logger.detail(`${tableName}: 0 rows`);
      }
    } catch {
      logger.detail(`${tableName}: table may not exist`);
    }
  }

  if (dryRun) return;

  for (const tableName of CHAT_TABLES) {
    try {
      await db.execute(sql.raw(`TRUNCATE TABLE "${tableName}" CASCADE`));
      logger.detail(`Truncated ${tableName}`);
    } catch (err) {
      logger.warn(`Could not truncate ${tableName}: ${(err as Error).message}`);
    }
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnvConfig(process.cwd());

  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new Error('NEON_DATABASE_URL is required');

  const { db, pool } = createDb(connectionString);
  const dryRun = process.argv.includes('--dry-run');

  logger.warn(
    'This will permanently delete all chat data. Proceeding in 3s...'
  );

  setTimeout(() => {
    teardownChat(db, dryRun)
      .then(() => {
        logger.success('Chat teardown completed');
        pool.end();
        process.exit(0);
      })
      .catch((err) => {
        logger.error(`Teardown failed: ${err}`);
        pool.end();
        process.exit(1);
      });
  }, 3000);
}

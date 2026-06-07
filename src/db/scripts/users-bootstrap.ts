/**
 * Bootstrap script for Users
 *
 * Creates development users in the Better Auth user table.
 */

import { loadEnvConfig } from '@next/env';
import { createDb } from '../connection';
import { user } from '../index';
import { logger } from './logger';
import { DEV_USER_ID, DEV_USER_EMAIL } from './constants';
import type { DbInstance, SeedResult } from './module-registry';

export async function bootstrapUsers(db: DbInstance): Promise<SeedResult> {
  let inserted = 0;
  let skipped = 0;

  const result = await db
    .insert(user)
    .values({
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      name: 'Dev User',
      allowlisted: true,
    })
    .onConflictDoNothing();

  if (result.rowCount && result.rowCount > 0) {
    inserted++;
    logger.detail(
      `Inserted dev user (ID: ${DEV_USER_ID}, email: ${DEV_USER_EMAIL})`
    );
  } else {
    skipped++;
    logger.detail(`Skipped dev user (ID: ${DEV_USER_ID}, already exists)`);
  }

  return { inserted, skipped };
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnvConfig(process.cwd());

  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new Error('NEON_DATABASE_URL is required');

  const { db, pool } = createDb(connectionString);
  logger.startOperation('users bootstrap');
  bootstrapUsers(db)
    .then((r) => {
      logger.success(
        `Users bootstrap: ${r.inserted} inserted, ${r.skipped} skipped`
      );
      pool.end();
      process.exit(0);
    })
    .catch((err) => {
      logger.error(`Bootstrap failed: ${err}`);
      pool.end();
      process.exit(1);
    });
}

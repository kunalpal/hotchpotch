import { createDb } from '../connection';
import { sql } from 'drizzle-orm';

type DbConnection = ReturnType<typeof createDb>;

let sharedConnection: DbConnection | null = null;

export function getSharedConnection(): DbConnection {
  if (!sharedConnection) {
    const connectionString = process.env.NEON_DATABASE_URL;
    if (!connectionString) {
      throw new Error('NEON_DATABASE_URL environment variable is required');
    }
    sharedConnection = createDb(connectionString);
  }
  return sharedConnection;
}

export async function closeSharedConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.pool.end();
    sharedConnection = null;
  }
}

export async function healthCheck(): Promise<void> {
  const { db } = getSharedConnection();
  await db.execute(sql`SELECT 1`);
}

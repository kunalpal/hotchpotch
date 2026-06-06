import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from 'ws';
import * as schema from '@/db/index';

// Configure Neon to use ws for WebSocket in Node.js/Lambda environments
neonConfig.webSocketConstructor = ws;

export function createDb(connectionString: string) {
  const isNeon = connectionString.includes('.neon.tech');

  if (!isNeon) {
    const pool = new PgPool({ connectionString });
    const db = drizzlePg(pool, { casing: 'snake_case', schema });
    return { db, pool, isLocal: true };
  } else {
    const pool = new NeonPool({ connectionString });
    const db = drizzleNeon(pool, { casing: 'snake_case', schema });
    return { db, pool, isLocal: false };
  }
}

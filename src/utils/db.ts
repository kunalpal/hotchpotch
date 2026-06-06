import { createDb } from '@/db/connection';
import { env } from '@/lib/env';

const { db, pool } = createDb(env.NEON_DATABASE_URL);

export { db, pool };
export default db;

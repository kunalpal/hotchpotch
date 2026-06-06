// Drizzle Kit TypeScript config
// Reads connection info from environment variables and local .env files
// to avoid committing secrets.

import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const connectionString = process.env.NEON_DATABASE_URL!;

const config = {
  // Point to the single re-exporting entry file for the schema. The schema
  // is split into grouped modules under `db/` and re-exported from `db/index.ts`.
  schema: ['./src/db/index.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
};

export default config;

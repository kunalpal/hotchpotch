import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { passkey } from '@better-auth/passkey';
import { db } from '@/utils/db';
import { env } from '@/lib/env';
import * as authSchema from '@/db/auth';

const appUrl = env.BETTER_AUTH_URL || 'http://localhost:3000';
const appOrigin = new URL(appUrl).origin;
const appHost = new URL(appUrl).hostname;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  user: {
    additionalFields: {
      allowlisted: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  logger: {
    level: 'debug',
  },
  advanced: {
    database: {
      generateId: ({ model }) => {
        // user table uses serial (auto-increment) — let PostgreSQL handle it
        if (model === 'user') {
          return undefined as unknown as string;
        }
        return crypto.randomUUID();
      },
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [
    nextCookies(),
    passkey({
      rpID: appHost,
      rpName: 'Hotchpotch',
      origin: appOrigin,
    }),
  ],
});

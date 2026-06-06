import { z } from 'zod';

const envSchema = z.object({
  // Required
  NEON_DATABASE_URL: z.string().min(1, 'NEON_DATABASE_URL is required'),
  BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
  BETTER_AUTH_URL: z.url('BETTER_AUTH_URL must be a valid URL'),
  NEXT_PUBLIC_SITE_URL: z.url('NEXT_PUBLIC_SITE_URL must be a valid URL'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  // Optional when MOCK_AI=true; the gateway provider itself will error at call-time if missing
  AI_GATEWAY_API_KEY: z.string().default(''),
  // Optional with defaults
  LOG_LEVEL: z.string().default('info'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

function validateEnv(): Env {
  if (_env) return _env;

  // During Docker image builds, real secrets are not available and should not
  // be baked into the image. Placeholder values allow module-level code
  // (db/auth init) to complete without crashing; they are never used at runtime
  // because the runner stage does not set this flag.
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    _env = {
      ...process.env,
      NEON_DATABASE_URL:
        process.env.NEON_DATABASE_URL ??
        'postgresql://placeholder:placeholder@localhost/placeholder',
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ?? 'build-placeholder-secret',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
      NEXT_PUBLIC_SITE_URL:
        process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? 'build-placeholder',
      GOOGLE_CLIENT_SECRET:
        process.env.GOOGLE_CLIENT_SECRET ?? 'build-placeholder',
    } as unknown as Env;
    return _env;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  _env = result.data;
  return _env;
}

export const env = new Proxy({} as Env, {
  get(_, prop: string) {
    const validated = validateEnv();
    return validated[prop as keyof Env];
  },
});

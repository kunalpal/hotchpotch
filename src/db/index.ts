// Re-export all schema tables here for Drizzle ORM and drizzle-kit.
// The db/connection.ts imports this as `* as schema`.
export * from './auth';
export * from './chat';


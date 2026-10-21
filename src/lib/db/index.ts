import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { migrate as migrateLite } from "drizzle-orm/pglite/migrator";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database client.
 * - With DATABASE_URL set (production): Postgres via postgres.js. Migrations run at build time
 *   (`npm run db:migrate`).
 * - Without it (local development): an embedded Postgres (PGlite) stored in ./.data/pglite,
 *   migrated automatically on first use. No setup needed.
 */
type Db = ReturnType<typeof drizzlePg<typeof schema>>;

const globalForDb = globalThis as unknown as { laneDb?: Promise<Db> };

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { prepare: false, max: 5 });
    return drizzlePg(client, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzleLite(client, { schema });
  await migrateLite(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  // Both drivers expose the same query-builder API; the cast lets callers use one type.
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  globalForDb.laneDb ??= create().catch((err: unknown) => {
    // Don't cache a failed connection; the next request retries.
    globalForDb.laneDb = undefined;
    throw err;
  });
  return globalForDb.laneDb;
}

export { schema };

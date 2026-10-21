// Applies SQL migrations in ./drizzle to the database in DATABASE_URL.
// Skipped when DATABASE_URL is unset (local dev uses PGlite, which migrates itself on first use).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("db:migrate — DATABASE_URL not set, skipping (local PGlite migrates on first use).");
  process.exit(0);
}
const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.end();
console.log("db:migrate — migrations applied.");

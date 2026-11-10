import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env.production" });
  }
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
}

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/sipena_ktt";

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };

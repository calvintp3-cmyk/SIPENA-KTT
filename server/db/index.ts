// server/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      '[DB] Environment variable DATABASE_URL belum disetel. Pastikan file .env sudah dikonfigurasi.',
    );
  }

  const instance = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  instance.on('error', (err) => {
    console.error('[DB Pool Error] Unexpected error on idle PostgreSQL client:', err.message);
  });

  return instance;
}

function createDrizzle(pgPool: Pool) {
  return drizzle(pgPool, { schema });
}

export type SipenaDatabase = ReturnType<typeof createDrizzle>;

let _pool: Pool | null = null;
let _db: SipenaDatabase | null = null;

export function getPool(): Pool {
  if (!_pool) {
    _pool = createPool();
  }
  return _pool;
}

export function getDb(): SipenaDatabase {
  if (!_db) {
    _db = createDrizzle(getPool());
  }
  return _db;
}

export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    if (prop === 'end' && !_pool) {
      return async () => {};
    }
    const instance = getPool();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const db: SipenaDatabase = new Proxy({} as SipenaDatabase, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

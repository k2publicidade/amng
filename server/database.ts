import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

export type SqlValue = string | number | null;
export type Row = Record<string, unknown>;
export interface Executor {
  get<T extends Row = Row>(sql: string, params?: SqlValue[]): Promise<T | undefined>;
  all<T extends Row = Row>(sql: string, params?: SqlValue[]): Promise<T[]>;
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number }>;
  lockUser(id: string): Promise<void>;
}
export interface Database extends Executor {
  dialect: 'sqlite' | 'postgres';
  transaction<T>(work: (tx: Executor) => Promise<T>): Promise<T>;
  script(sql: string): Promise<void>;
  close(): Promise<void>;
}

/** One lock covers the whole SQLite transaction, including asynchronous continuations. */
class Mutex {
  private tail: Promise<void> = Promise.resolve();
  async use<T>(work: () => Promise<T>): Promise<T> {
    const predecessor = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    await predecessor;
    try { return await work(); } finally { release(); }
  }
}

export function sqliteDatabase(filename: string): Database {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  // Corruption is intentionally fatal: opening failure must never create replacement balances.
  const connection = new DatabaseSync(filename);
  connection.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (filename !== ':memory:') connection.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
  const mutex = new Mutex();
  const tx: Executor = {
    async get<T extends Row>(sql: string, params: SqlValue[] = []) {
      return connection.prepare(sql).get(...params) as T | undefined;
    },
    async all<T extends Row>(sql: string, params: SqlValue[] = []) {
      return connection.prepare(sql).all(...params) as T[];
    },
    async run(sql, params = []) {
      return { changes: Number(connection.prepare(sql).run(...params).changes) };
    },
    async lockUser(id) { await tx.get('SELECT id FROM users WHERE id = ?', [id]); },
  };
  return {
    dialect: 'sqlite',
    get: (sql, params) => mutex.use(() => tx.get(sql, params)),
    all: (sql, params) => mutex.use(() => tx.all(sql, params)),
    run: (sql, params) => mutex.use(() => tx.run(sql, params)),
    lockUser: (id) => mutex.use(() => tx.lockUser(id)),
    script: (sql) => mutex.use(async () => { connection.exec(sql); }),
    transaction: work => mutex.use(async () => {
      connection.exec('BEGIN IMMEDIATE');
      try {
        const result = await work(tx);
        connection.exec('COMMIT');
        return result;
      } catch (error) { connection.exec('ROLLBACK'); throw error; }
    }),
    close: () => mutex.use(async () => { connection.close(); }),
  };
}

// All monetary values are constrained to JS safe integers by the domain and schema.
pg.types.setTypeParser(20, value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Unsafe BIGINT in database');
  return number;
});
function placeholders(sql: string) {
  let index = 0;
  // Application SQL never contains question marks in string literals.
  return sql.replace(/\?/g, () => `$${++index}`);
}
function postgresExecutor(queryable: pg.Pool | pg.PoolClient): Executor {
  return {
    async get<T extends Row>(sql: string, params: SqlValue[] = []) {
      const result = await queryable.query(placeholders(sql), params);
      return result.rows[0] as T | undefined;
    },
    async all<T extends Row>(sql: string, params: SqlValue[] = []) {
      const result = await queryable.query(placeholders(sql), params);
      return result.rows as T[];
    },
    async run(sql, params = []) {
      const result = await queryable.query(placeholders(sql), params);
      return { changes: result.rowCount ?? 0 };
    },
    async lockUser(id) {
      await queryable.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [id]);
    },
  };
}
export function postgresDatabase(url: string): Database {
  const pool = new pg.Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 5000 });
  const executor = postgresExecutor(pool);
  return {
    ...executor, dialect: 'postgres',
    async script(sql) { await pool.query(sql); },
    async transaction<T>(work: (tx: Executor) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        const result = await work(postgresExecutor(client));
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    async close() { await pool.end(); },
  };
}

/**
 * SQLite wrapper around `op-sqlite`. The roster cache lives in a single
 * file `ektahr-kiosk.db` at the OS-chosen database location.
 */

// `op-sqlite` ships as `@op-engineering/op-sqlite`. We use a structural type
// here to avoid a hard dep at type-check time before native install runs.
type OPSQLiteConnection = {
  execute: (sql: string, params?: unknown[]) => Promise<{ rows?: unknown[] }>;
  transaction: (cb: (tx: OPSQLiteConnection) => Promise<void>) => Promise<void>;
  close: () => void;
};

let db: OPSQLiteConnection | null = null;
let loading: Promise<OPSQLiteConnection | null> | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL,
  pose TEXT NOT NULL,
  vector BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_embeddings_employee ON embeddings(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_updated ON employees(updated_at);
`;

export async function getDb(): Promise<OPSQLiteConnection | null> {
  if (db) return db;
  if (loading) return loading;
  loading = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const opsqlite: any = require('@op-engineering/op-sqlite');
      const conn: OPSQLiteConnection = opsqlite.open({ name: 'ektahr-kiosk.db' });
      await conn.execute(SCHEMA);
      db = conn;
      return db;
    } catch (e) {
      console.warn('[sqlite] Failed to open DB:', e);
      return null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export async function closeDb() {
  try {
    db?.close();
  } catch {
    /* */
  }
  db = null;
}

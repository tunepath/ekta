type OPSQLiteConnection = {
  execute: (sql: string, params?: unknown[]) => Promise<{ rows?: unknown[] }>;
  transaction: (cb: (tx: OPSQLiteConnection) => Promise<void>) => Promise<void>;
  close: () => void;
};

export async function getDb(): Promise<OPSQLiteConnection | null> {
  return null;
}

export async function closeDb() {}

import { getDb } from './sqlite';

export type RosterEmployee = {
  id: string;
  employee_code: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  updated_at: number;
};

export type RosterEmbedding = {
  employee_id: string;
  pose: 'left' | 'forward' | 'right';
  vector: Float32Array;
};

function vectorToBlob(v: Float32Array): ArrayBuffer {
  const copy = new ArrayBuffer(v.byteLength);
  new Float32Array(copy).set(v);
  return copy;
}

function blobToVector(blob: ArrayBuffer): Float32Array {
  return new Float32Array(blob);
}

export async function upsertEmployee(emp: RosterEmployee): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(
    `INSERT INTO employees (id, employee_code, name, phone, photo_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       employee_code = excluded.employee_code,
       name = excluded.name,
       phone = excluded.phone,
       photo_url = excluded.photo_url,
       updated_at = excluded.updated_at`,
    [emp.id, emp.employee_code, emp.name, emp.phone, emp.photo_url, emp.updated_at]
  );
}

export async function getEmployee(id: string): Promise<RosterEmployee | null> {
  const db = await getDb();
  if (!db) return null;
  const r = await db.execute('SELECT * FROM employees WHERE id = ?', [id]);
  const row = r.rows?.[0];
  return row ? (row as unknown as RosterEmployee) : null;
}

export async function listEmployees(): Promise<RosterEmployee[]> {
  const db = await getDb();
  if (!db) return [];
  const r = await db.execute('SELECT * FROM employees ORDER BY name');
  return (r.rows ?? []) as unknown as RosterEmployee[];
}

export async function replaceEmbeddings(
  employee_id: string,
  vectors: RosterEmbedding[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.transaction(async (tx) => {
    await tx.execute('DELETE FROM embeddings WHERE employee_id = ?', [employee_id]);
    for (const e of vectors) {
      await tx.execute(
        'INSERT INTO embeddings (employee_id, pose, vector, created_at) VALUES (?, ?, ?, ?)',
        [e.employee_id, e.pose, vectorToBlob(e.vector), Date.now()]
      );
    }
  });
}

export async function loadAllEmbeddings(): Promise<RosterEmbedding[]> {
  const db = await getDb();
  if (!db) return [];
  const r = await db.execute('SELECT employee_id, pose, vector FROM embeddings');
  return (r.rows ?? []).map((row: any) => ({
    employee_id: row.employee_id,
    pose: row.pose,
    vector: blobToVector(row.vector as ArrayBuffer),
  }));
}

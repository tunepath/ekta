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

const employees = new Map<string, RosterEmployee>();
const embeddings: RosterEmbedding[] = [];

export async function upsertEmployee(emp: RosterEmployee): Promise<void> {
  employees.set(emp.id, emp);
}

export async function getEmployee(id: string): Promise<RosterEmployee | null> {
  return employees.get(id) ?? null;
}

export async function listEmployees(): Promise<RosterEmployee[]> {
  return Array.from(employees.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function replaceEmbeddings(
  employee_id: string,
  vectors: RosterEmbedding[]
): Promise<void> {
  for (let i = embeddings.length - 1; i >= 0; i--) {
    if (embeddings[i].employee_id === employee_id) embeddings.splice(i, 1);
  }
  for (const v of vectors) embeddings.push(v);
}

export async function loadAllEmbeddings(): Promise<RosterEmbedding[]> {
  return embeddings.slice();
}

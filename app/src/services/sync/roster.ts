import { listAllEmployees } from '@/services/api/employees';
import {
  loadAllEmbeddings,
  upsertEmployee,
  type RosterEmbedding,
  type RosterEmployee,
} from '@/services/db/roster';

/**
 * Pulls the latest employee roster from the server and merges into the local
 * SQLite cache. Embeddings come from enrollment uploads and are stored
 * locally — they are NOT re-fetched from the server here.
 *
 * Phase 5: incremental sync via `since` cursor will be added once the HRMS
 * API exposes one. For now we replace fully.
 */
export async function syncRoster(): Promise<{ employees: number; embeddings: number }> {
  const items = await listAllEmployees();
  for (const e of items) {
    const row: RosterEmployee = {
      id: e.id,
      employee_code: e.employee_code,
      name: e.name,
      phone: e.phone,
      photo_url: e.photo_url,
      updated_at: Date.now(),
    };
    await upsertEmployee(row);
  }
  const embeds = await loadAllEmbeddings();
  return { employees: items.length, embeddings: embeds.length };
}

/** In-memory roster of embeddings for fast matching. */
let rosterCache: RosterEmbedding[] = [];

export async function loadRosterToMemory(): Promise<RosterEmbedding[]> {
  rosterCache = await loadAllEmbeddings();
  return rosterCache;
}

export function getRosterInMemory(): RosterEmbedding[] {
  return rosterCache;
}

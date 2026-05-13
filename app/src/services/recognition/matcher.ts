import { cosineSimilarity } from '@/services/ml/embedder';
import type { RosterEmbedding } from '@/services/db/roster';

export type MatchResult = {
  employee_id: string;
  similarity: number;
  margin: number;
};

const MARGIN = 0.05;

/**
 * Match a candidate embedding against the in-memory roster.
 * Returns the best match if similarity > threshold AND
 * margin over top-2 is sufficient. Otherwise null.
 *
 * For 1k employees × 3 embeddings each = 3k cosine sims — runs in
 * well under 5ms on any modern phone.
 */
export function findBestMatch(
  candidate: Float32Array,
  roster: RosterEmbedding[],
  threshold: number
): MatchResult | null {
  // Take max similarity per employee (across their 3 poses)
  const perEmployee = new Map<string, number>();
  for (const e of roster) {
    const s = cosineSimilarity(candidate, e.vector);
    const prev = perEmployee.get(e.employee_id);
    if (prev === undefined || s > prev) {
      perEmployee.set(e.employee_id, s);
    }
  }

  const ranked = Array.from(perEmployee.entries())
    .map(([employee_id, similarity]) => ({ employee_id, similarity }))
    .sort((a, b) => b.similarity - a.similarity);

  const top = ranked[0];
  if (!top || top.similarity < threshold) return null;

  const second = ranked[1];
  const margin = top.similarity - (second?.similarity ?? 0);
  if (margin < MARGIN) return null;

  return {
    employee_id: top.employee_id,
    similarity: top.similarity,
    margin,
  };
}

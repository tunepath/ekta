import { Hono } from 'hono';

type Office = { id: string; name: string; lat: number; lng: number };

const offices: Office[] = [
  { id: 'off-1', name: 'Mumbai HQ - Reception', lat: 19.076, lng: 72.8777 },
  { id: 'off-2', name: 'Chennai Branch', lat: 13.0827, lng: 80.2707 },
  { id: 'off-3', name: 'Bangalore Office', lat: 12.9716, lng: 77.5946 },
];

export const officesRoutes = new Hono();

officesRoutes.get('/', (c) => c.json({ items: offices }));

/**
 * POST /offices/match { lat, lng }
 * Returns nearest office + all candidates with distance, for the kiosk
 * GPS-tag flow (PLAN section A1).
 */
officesRoutes.post('/match', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { lat?: number; lng?: number };

  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return c.json({ match: null, candidates: offices.map((o) => ({ ...o, distance_m: Infinity })) });
  }

  const ranked = offices
    .map((o) => {
      const dLat = (o.lat - body.lat!) * 111_000;
      const dLng = (o.lng - body.lng!) * 111_000 * Math.cos((body.lat! * Math.PI) / 180);
      return { ...o, distance_m: Math.round(Math.hypot(dLat, dLng)) };
    })
    .sort((a, b) => a.distance_m - b.distance_m);

  const nearest = ranked[0];
  const match = nearest && nearest.distance_m < 500 ? nearest : null;

  return c.json({ match, candidates: ranked });
});

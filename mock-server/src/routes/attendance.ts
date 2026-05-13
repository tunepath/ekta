import { Hono } from 'hono';

type Punch = {
  id: string;
  client_uuid: string;
  employee_id: string;
  type: 'in' | 'out';
  ts: string;
  server_ts: string;
  lat: number | null;
  lng: number | null;
  kiosk_id: string;
  confidence: number;
  liveness_score: number;
  shift_name: string;
  on_time: boolean;
  today_minutes?: number;
};

const punches: Punch[] = [];

export const attendanceRoutes = new Hono();

attendanceRoutes.post('/', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Partial<Punch>;

  if (!body.employee_id || !body.type || !body.client_uuid) {
    return c.json({ error: 'missing_fields' }, 400);
  }

  // Idempotency by client_uuid — return existing if already recorded.
  const existing = punches.find((p) => p.client_uuid === body.client_uuid);
  if (existing) {
    return c.json(existing);
  }

  const record: Punch = {
    id: `att-${Date.now()}`,
    client_uuid: body.client_uuid,
    employee_id: body.employee_id,
    type: body.type,
    ts: body.ts ?? new Date().toISOString(),
    server_ts: new Date().toISOString(),
    lat: body.lat ?? null,
    lng: body.lng ?? null,
    kiosk_id: body.kiosk_id ?? 'unknown',
    confidence: body.confidence ?? 0,
    liveness_score: body.liveness_score ?? 0,
    shift_name: 'Day Shift',
    on_time: true,
    today_minutes: body.type === 'out' ? 503 : undefined,
  };

  punches.push(record);
  return c.json(record);
});

attendanceRoutes.get('/', (c) => {
  return c.json({ items: punches, total: punches.length });
});

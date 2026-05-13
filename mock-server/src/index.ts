import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authRoutes } from './routes/auth.js';
import { employeesRoutes } from './routes/employees.js';
import { attendanceRoutes } from './routes/attendance.js';
import { officesRoutes } from './routes/offices.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/', (c) =>
  c.json({
    status: 'ok',
    service: 'ektahr-kiosk-mock-server',
    note: 'Mock backend for the ektaHR kiosk app. Replaced by real ektaHR APIs in production.',
  })
);

app.route('/auth', authRoutes);
app.route('/employees', employeesRoutes);
app.route('/attendance', attendanceRoutes);
app.route('/offices', officesRoutes);

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[mock-server] listening at http://localhost:${info.port}`);
});

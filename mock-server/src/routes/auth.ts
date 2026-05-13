import { Hono } from 'hono';

export const authRoutes = new Hono();

/**
 * POST /auth/login
 * Phase 1 will validate against a real role check. For now any non-empty
 * email + password mock-succeeds and the user is treated as a Kiosk Admin.
 */
authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}) as { email?: string; password?: string });

  if (!body.email || !body.password) {
    return c.json({ error: 'missing_credentials' }, 400);
  }

  return c.json({
    token: `mock-access-${Date.now()}`,
    refresh_token: `mock-refresh-${Date.now()}`,
    user: {
      id: 'admin-1',
      email: body.email,
      name: 'Mock Kiosk Admin',
      role: 'kiosk_admin',
    },
    requires_otp: false,
  });
});

authRoutes.post('/refresh', async (c) => {
  return c.json({
    token: `mock-access-${Date.now()}`,
    refresh_token: `mock-refresh-${Date.now()}`,
  });
});

authRoutes.post('/logout', async (c) => c.json({ status: 'ok' }));

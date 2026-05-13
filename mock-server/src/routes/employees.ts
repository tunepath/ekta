import { Hono } from 'hono';

type Employee = {
  id: string;
  employee_code: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
};

const employees: Employee[] = [
  { id: 'e1', employee_code: 'EMP001', name: 'Alex Kumar', phone: '+919999999991', photo_url: null },
  { id: 'e2', employee_code: 'EMP002', name: 'Priya Sharma', phone: '+919999999992', photo_url: null },
  { id: 'e3', employee_code: 'EMP003', name: 'Rahul Verma', phone: '+919999999993', photo_url: null },
  { id: 'e4', employee_code: 'EMP004', name: 'Anjali Singh', phone: '+919999999994', photo_url: null },
];

export const employeesRoutes = new Hono();

employeesRoutes.get('/', (c) => {
  return c.json({ items: employees, total: employees.length });
});

employeesRoutes.get('/:code', (c) => {
  const code = c.req.param('code');
  const employee = employees.find((e) => e.employee_code === code);
  if (!employee) return c.json({ error: 'not_found' }, 404);
  return c.json(employee);
});

/**
 * POST /employees/{id}/face-embeddings
 * Body: { embeddings: number[][], photo_data_url?: string }
 * Phase 7 wires this end-to-end. For now we just accept.
 */
employeesRoutes.post('/:id/face-embeddings', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const employee = employees.find((e) => e.id === id);
  if (!employee) return c.json({ error: 'not_found' }, 404);
  return c.json({ status: 'ok', employee_id: id, received_at: new Date().toISOString() });
});

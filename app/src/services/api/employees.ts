import { z } from 'zod';

import { apiClient } from './client';
import { EmployeeSchema, type Employee } from './schemas';

const EmployeesListSchema = z.object({ items: z.array(EmployeeSchema), total: z.number() });

export async function getEmployeeByCode(code: string): Promise<Employee> {
  const res = await apiClient.get(`/employees/${encodeURIComponent(code)}`);
  return EmployeeSchema.parse(res.data);
}

export async function listAllEmployees(): Promise<Employee[]> {
  const res = await apiClient.get('/employees');
  return EmployeesListSchema.parse(res.data).items;
}

export async function uploadFaceEmbeddings(
  employee_id: string,
  embeddings: { pose: 'left' | 'forward' | 'right'; vector: number[] }[],
  photoDataUrl?: string
) {
  const res = await apiClient.post(`/employees/${encodeURIComponent(employee_id)}/face-embeddings`, {
    embeddings,
    photo_data_url: photoDataUrl,
  });
  return res.data;
}

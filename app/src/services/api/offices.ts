import { apiClient } from './client';
import { OfficeMatchResponseSchema, OfficeSchema } from './schemas';
import { z } from 'zod';

const OfficesListSchema = z.object({ items: z.array(OfficeSchema) });

export async function listOffices() {
  const res = await apiClient.get('/offices');
  return OfficesListSchema.parse(res.data).items;
}

export async function matchOffice(lat: number, lng: number) {
  const res = await apiClient.post('/offices/match', { lat, lng });
  return OfficeMatchResponseSchema.parse(res.data);
}

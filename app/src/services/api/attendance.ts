import { apiClient } from './client';
import {
  PunchRequestSchema,
  PunchResponseSchema,
  type PunchRequest,
  type PunchResponse,
} from './schemas';

export async function postPunch(req: PunchRequest): Promise<PunchResponse> {
  PunchRequestSchema.parse(req);
  const res = await apiClient.post('/attendance', req);
  return PunchResponseSchema.parse(res.data);
}

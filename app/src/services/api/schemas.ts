import { z } from 'zod';

/**
 * Placeholder schemas — these are skeletons that match the mock-server
 * responses. They'll be reconciled with the real ektaHR API spec once
 * the Postman / Swagger docs land.
 */

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const LoginResponseSchema = z.object({
  token: z.string(),
  refresh_token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
  }),
  requires_otp: z.boolean().default(false),
});

export const EmployeeSchema = z.object({
  id: z.string(),
  employee_code: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  photo_url: z.string().nullable(),
});

export const OfficeSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
});

export const OfficeMatchResponseSchema = z.object({
  match: OfficeSchema.extend({ distance_m: z.number() }).nullable(),
  candidates: z.array(OfficeSchema.extend({ distance_m: z.number() })),
});

export const PunchRequestSchema = z.object({
  employee_id: z.string(),
  type: z.enum(['in', 'out']),
  ts: z.string(), // ISO 8601 UTC
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  kiosk_id: z.string(),
  confidence: z.number().min(0).max(1),
  liveness_score: z.number().min(0).max(1),
  client_uuid: z.string().uuid(),
});

export const PunchResponseSchema = z.object({
  id: z.string(),
  type: z.enum(['in', 'out']),
  server_ts: z.string(),
  shift_name: z.string().nullable(),
  on_time: z.boolean().nullable(),
  today_minutes: z.number().optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type Employee = z.infer<typeof EmployeeSchema>;
export type Office = z.infer<typeof OfficeSchema>;
export type PunchRequest = z.infer<typeof PunchRequestSchema>;
export type PunchResponse = z.infer<typeof PunchResponseSchema>;

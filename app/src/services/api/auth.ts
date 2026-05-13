import { apiClient } from './client';
import { LoginResponseSchema, type LoginResponse } from './schemas';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post('/auth/login', { email, password });
  return LoginResponseSchema.parse(res.data);
}

export async function refreshAuth(refreshToken: string): Promise<{ token: string; refresh_token: string }> {
  const res = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
  return res.data;
}

export async function serverLogout(token: string): Promise<void> {
  try {
    await apiClient.post('/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // best effort — client clears state regardless
  }
}

import axios, { type AxiosInstance } from 'axios';

import { env } from '@/config/env';

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Phase 1 will add:
// - Request interceptor: attach Bearer token from secure store
// - Response interceptor: silent refresh on 401, force-logout on 403 deactivated

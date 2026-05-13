import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { useSessionStore } from '@/stores/session';
import { refreshAuth } from './auth';

let refreshPromise: Promise<string | null> | null = null;

/**
 * Attaches the request + response interceptors that handle:
 * - Bearer token attach
 * - Silent refresh on 401 (single-flight)
 * - Force-logout on 403 with reason=deactivated (Step A8)
 */
export function installInterceptors(client: AxiosInstance) {
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { token } = useSessionStore.getState();
    if (token && !config.headers.has('Authorization')) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const data = error.response?.data as { reason?: string } | undefined;
      const originalConfig = error.config as InternalAxiosRequestConfig & {
        _retried?: boolean;
      };

      // Force logout on deactivated account
      if (status === 403 && data?.reason === 'deactivated') {
        await useSessionStore.getState().clearSession();
        return Promise.reject(
          Object.assign(new Error('account_deactivated'), { isHandled: true })
        );
      }

      // Silent refresh on 401, once per request
      if (status === 401 && !originalConfig._retried) {
        originalConfig._retried = true;
        try {
          if (!refreshPromise) {
            const { refreshToken } = useSessionStore.getState();
            if (!refreshToken) throw new Error('no_refresh_token');
            refreshPromise = refreshAuth(refreshToken).then(async (r) => {
              await useSessionStore.getState().setTokens(r.token, r.refresh_token);
              return r.token;
            });
          }
          const newToken = await refreshPromise;
          refreshPromise = null;
          if (newToken && originalConfig.headers) {
            originalConfig.headers.set('Authorization', `Bearer ${newToken}`);
          }
          return client.request(originalConfig);
        } catch {
          refreshPromise = null;
          await useSessionStore.getState().clearSession();
          return Promise.reject(
            Object.assign(new Error('session_expired'), { isHandled: true })
          );
        }
      }

      return Promise.reject(error);
    }
  );
}

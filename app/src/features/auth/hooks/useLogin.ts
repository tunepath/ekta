import { useMutation } from '@tanstack/react-query';

import { login } from '@/services/api/auth';
import { useSessionStore } from '@/stores/session';

export function useLogin() {
  const setSession = useSessionStore((s) => s.setSession);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: async (data) => {
      if (data.user.role !== 'kiosk_admin') {
        throw new Error('not_kiosk_admin');
      }
      await setSession(data.token, data.refresh_token, data.user);
    },
  });
}

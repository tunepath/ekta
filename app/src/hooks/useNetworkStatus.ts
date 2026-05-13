import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

/**
 * Lightweight online/offline monitor. Polled every 5s as a fallback —
 * Network module also fires events on most platforms.
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const s = await Network.getNetworkStateAsync();
        if (!cancelled) setOnline(Boolean(s.isConnected && s.isInternetReachable !== false));
      } catch {
        if (!cancelled) setOnline(false);
      }
    }
    check();
    const id = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return online;
}

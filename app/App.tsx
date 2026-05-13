import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { RootNavigator } from '@/navigation/RootNavigator';
import { apiClient } from '@/services/api/client';
import { installInterceptors } from '@/services/api/interceptors';
import { useSettingsStore } from '@/stores/settings';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

installInterceptors(apiClient);

// Global JS error handler — at least surfaces unhandled errors in logcat so a
// crash on a phone without ADB can still be diagnosed via the system log.
const originalHandler = (globalThis as any).ErrorUtils?.getGlobalHandler?.();
(globalThis as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
  console.error('[GlobalError]', isFatal ? 'FATAL' : 'non-fatal', error?.message, error?.stack);
  originalHandler?.(error, isFatal);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    hydrateSettings().catch((e) => console.warn('[hydrateSettings]', e));
    // ML model loading deferred until first use (avoids startup crash if the
    // native lib or model file isn't present). See services/ml/embedder.ts.
  }, [hydrateSettings]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

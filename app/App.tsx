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
import { loadEmbedderModel } from '@/services/ml/embedder';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

installInterceptors(apiClient);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    hydrateSettings();
    // Begin loading the ML model in the background — non-blocking
    loadEmbedderModel().catch(() => {});
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

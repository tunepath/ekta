import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useSessionStore } from '@/stores/session';
import { useKioskStore } from '@/stores/kiosk';
import { useAdminPinStore } from '@/stores/adminPin';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

/**
 * Boot-time router. Hydrates persisted state from secure-store, then routes
 * to the correct entry screen based on session + setup state.
 */
export function SplashScreen() {
  const nav = useNavigation<Nav>();
  const hydrateSession = useSessionStore((s) => s.hydrate);
  const hydrateKiosk = useKioskStore((s) => s.hydrate);
  const hydratePin = useAdminPinStore((s) => s.hydrate);

  useEffect(() => {
    (async () => {
      await Promise.all([hydrateSession(), hydrateKiosk(), hydratePin()]);
      const { token, admin } = useSessionStore.getState();
      const { office } = useKioskStore.getState();
      const hasPinForCurrent =
        admin ? await useAdminPinStore.getState().hasPin(admin.email) : false;

      if (!token || !admin) {
        nav.replace('SignIn');
      } else if (!office) {
        nav.replace('KioskIdentity');
      } else if (!hasPinForCurrent) {
        nav.replace('PinSetup');
      } else {
        nav.replace('Idle');
      }
    })();
  }, [hydrateSession, hydrateKiosk, hydratePin, nav]);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={colors.brand.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

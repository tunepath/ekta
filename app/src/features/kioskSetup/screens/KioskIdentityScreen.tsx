import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';

import { colors, typography, spacing, radius, shadow } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { listOffices, matchOffice } from '@/services/api/offices';
import { useKioskStore, type KioskOffice } from '@/stores/kiosk';
import type { Office } from '@/services/api/schemas';

type Nav = NativeStackNavigationProp<RootStackParamList, 'KioskIdentity'>;
type State = 'detecting' | 'matched' | 'manual' | 'error';

export function KioskIdentityScreen() {
  const nav = useNavigation<Nav>();
  const setOffice = useKioskStore((s) => s.setOffice);
  const [state, setState] = useState<State>('detecting');
  const [matched, setMatched] = useState<KioskOffice | null>(null);
  const [candidates, setCandidates] = useState<Office[]>([]);
  const [selected, setSelected] = useState<Office | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          await loadOfficesForPicker();
          return;
        }

        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
        ]);

        if (cancelled) return;

        if (!pos) {
          await loadOfficesForPicker();
          return;
        }

        const { match, candidates: cands } = await matchOffice(
          pos.coords.latitude,
          pos.coords.longitude
        );

        if (cancelled) return;

        if (match) {
          setMatched({ id: match.id, name: match.name, lat: match.lat, lng: match.lng });
          setCandidates(cands);
          setState('matched');
        } else {
          setCandidates(cands);
          setState('manual');
        }
      } catch (e) {
        if (cancelled) return;
        setError(String(e));
        await loadOfficesForPicker();
      }
    }

    async function loadOfficesForPicker() {
      try {
        const offices = await listOffices();
        setCandidates(offices);
        setState('manual');
      } catch (e) {
        setError(String(e));
        setState('error');
      }
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmOffice(office: KioskOffice) {
    await setOffice(office);
    nav.replace('PinSetup');
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Set up this kiosk</Text>
      </View>

      {state === 'detecting' ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.statusText}>Detecting location…</Text>
        </View>
      ) : null}

      {state === 'matched' && matched ? (
        <View style={styles.body}>
          <Text style={styles.intro}>We detected this kiosk location:</Text>
          <View style={[styles.officeCard, styles.officeCardSelected]}>
            <Text style={styles.officeName}>{matched.name}</Text>
            <Text style={styles.officeDistance}>Matched via GPS</Text>
          </View>
          <Pressable
            style={[styles.primary, shadow.primaryButton]}
            onPress={() => confirmOffice(matched)}
          >
            <Text style={styles.primaryText}>Confirm and continue</Text>
          </Pressable>
          <Pressable onPress={() => setState('manual')}>
            <Text style={styles.linkText}>Choose a different location</Text>
          </Pressable>
        </View>
      ) : null}

      {state === 'manual' ? (
        <View style={styles.body}>
          <Text style={styles.intro}>Choose this kiosk’s location:</Text>
          <ScrollView style={styles.list}>
            {candidates.map((office) => (
              <Pressable
                key={office.id}
                style={[
                  styles.officeCard,
                  selected?.id === office.id && styles.officeCardSelected,
                ]}
                onPress={() => setSelected(office)}
              >
                <Text style={styles.officeName}>{office.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={[styles.primary, shadow.primaryButton, !selected && styles.primaryDisabled]}
            disabled={!selected}
            onPress={() =>
              selected &&
              confirmOffice({
                id: selected.id,
                name: selected.name,
                lat: selected.lat,
                lng: selected.lng,
              })
            }
          >
            <Text style={styles.primaryText}>Confirm and continue</Text>
          </Pressable>
        </View>
      ) : null}

      {state === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.statusText}>Couldn’t fetch office list.</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.dark.bg },
  header: { padding: spacing.pagePadding },
  headerTitle: {
    fontSize: typography.display.fontSize,
    fontWeight: typography.display.fontWeight as '600',
    color: colors.text.primary.onDark,
  },
  body: { flex: 1, padding: spacing.pagePadding, gap: spacing.medium },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.medium },
  intro: { fontSize: typography.body.fontSize, color: colors.text.muted },
  list: { flex: 1 },
  officeCard: {
    padding: spacing.medium,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
    marginBottom: spacing.small,
  },
  officeCardSelected: { borderColor: colors.brand.primary },
  officeName: { fontSize: typography.body.fontSize, color: colors.text.primary.onDark, fontWeight: '600' },
  officeDistance: { fontSize: typography.caption.fontSize, color: colors.text.muted, marginTop: 4 },
  primary: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { fontSize: typography.button.fontSize, fontWeight: '600', color: colors.text.onPrimary },
  linkText: { color: colors.brand.primary, textAlign: 'center', paddingVertical: spacing.medium },
  statusText: { fontSize: typography.body.fontSize, color: colors.text.muted },
  errorText: { fontSize: typography.caption.fontSize, color: colors.status.error, textAlign: 'center', marginTop: spacing.small },
});

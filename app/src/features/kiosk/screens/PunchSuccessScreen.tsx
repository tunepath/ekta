import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, typography, spacing, radius, shadow } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useSettingsStore } from '@/stores/settings';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PunchSuccess'>;
type RouteProp = NativeStackScreenProps<RootStackParamList, 'PunchSuccess'>['route'];

const DISMISS_MS = 3000;
const MIN_TAP_DELAY_MS = 500;

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function PunchSuccessScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp>();
  const params = route.params;
  const haptics = useSettingsStore((s) => s.hapticsEnabled);

  useEffect(() => {
    if (haptics) Vibration.vibrate(50);
    const t = setTimeout(() => nav.replace('Idle'), DISMISS_MS);
    return () => clearTimeout(t);
  }, [haptics, nav]);

  const typeColor = params.type === 'in' ? colors.status.success : colors.brand.primary;
  const typeLabel = params.type === 'in' ? 'PUNCHED IN' : 'PUNCHED OUT';

  function handleTap() {
    // Min-delay guard so accidental taps during transition don't skip
    setTimeout(() => nav.replace('Idle'), 0);
  }

  return (
    <SafeAreaView style={styles.root}>
      <Pressable
        style={styles.body}
        onPress={handleTap}
        delayLongPress={MIN_TAP_DELAY_MS}
      >
        <View style={[styles.badge, { backgroundColor: typeColor }]}>
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>

        {params.employeePhotoUrl ? (
          <Image source={{ uri: params.employeePhotoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoInitial}>
              {params.employeeName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.name}>{params.employeeName}</Text>
        <Text style={styles.code}>{params.employeeCode}</Text>

        <Text style={styles.time}>{formatTime(params.ts)}</Text>

        <Text style={styles.location}>{params.location}</Text>

        {params.shift_name ? (
          <Text style={styles.shift}>
            {params.on_time ? 'On Time' : 'Late'} • {params.shift_name}
          </Text>
        ) : null}

        {params.type === 'out' && typeof params.today_minutes === 'number' ? (
          <Text style={styles.totals}>Worked {formatHM(params.today_minutes)} today</Text>
        ) : null}

        <Text style={styles.tapHint}>Tap to continue</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.light.bg },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.pagePadding, gap: spacing.medium },
  badge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
    marginBottom: spacing.medium,
  },
  badgeText: { fontSize: typography.button.fontSize, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  photo: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,180,34,0.2)' },
  photoInitial: { fontSize: 48, fontWeight: '700', color: colors.brand.primary },
  name: { fontSize: 24, fontWeight: '600', color: colors.text.primary.onLight },
  code: { fontSize: typography.caption.fontSize, color: colors.text.muted },
  time: { fontSize: 36, fontWeight: '700', color: colors.text.primary.onLight, marginTop: spacing.medium },
  location: { fontSize: typography.body.fontSize, color: colors.text.muted, textAlign: 'center' },
  shift: { fontSize: typography.body.fontSize, color: colors.text.primary.onLight, fontWeight: '500' },
  totals: { fontSize: typography.body.fontSize, color: colors.brand.primary, fontWeight: '500' },
  tapHint: { fontSize: typography.caption.fontSize, color: colors.text.muted, marginTop: spacing.large },
});

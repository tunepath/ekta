import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

import { PlaceholderScreen } from '@/shared/ui/PlaceholderScreen';
import { colors, typography, spacing, radius } from '@/config/theme';
import { useKioskStore } from '@/stores/kiosk';
import { useSessionStore } from '@/stores/session';

export function AboutScreen() {
  const office = useKioskStore((s) => s.office);
  const deviceId = useKioskStore((s) => s.deviceId);
  const admin = useSessionStore((s) => s.admin);

  return (
    <PlaceholderScreen title="About" subtitle="Diagnostics + device info.">
      <View style={styles.list}>
        <Row label="App version" value={Constants.expoConfig?.version ?? 'dev'} />
        <Row label="Kiosk ID" value={deviceId ?? '—'} />
        <Row label="Location" value={office?.name ?? 'not set'} />
        <Row label="Admin" value={admin?.email ?? '—'} />
        <Row label="Build" value={String(Constants.expoConfig?.runtimeVersion ?? 'dev')} />
      </View>
    </PlaceholderScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.small },
  row: {
    padding: spacing.medium,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
  },
  rowLabel: { color: colors.text.muted, fontSize: typography.caption.fontSize },
  rowValue: { color: colors.text.primary.onDark, fontSize: typography.body.fontSize, marginTop: 4 },
});

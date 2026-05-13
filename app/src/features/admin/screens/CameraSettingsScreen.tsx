import { View, Text, Pressable, StyleSheet } from 'react-native';

import { PlaceholderScreen } from '@/shared/ui/PlaceholderScreen';
import { colors, typography, spacing, radius } from '@/config/theme';
import { useSettingsStore } from '@/stores/settings';

const OPTIONS: { value: 'low' | 'medium' | 'high'; label: string; description: string }[] = [
  { value: 'low', label: 'Low (5 fps)', description: 'Best for low-end devices. Slower face detection.' },
  { value: 'medium', label: 'Medium (10 fps)', description: 'Default. Good balance for most phones.' },
  { value: 'high', label: 'High (15 fps)', description: 'Smoothest detection. Higher battery + heat.' },
];

export function CameraSettingsScreen() {
  const fps = useSettingsStore((s) => s.cameraFps);
  const setFps = useSettingsStore((s) => s.setCameraFps);

  return (
    <PlaceholderScreen title="Camera" subtitle="Front camera frame rate.">
      {OPTIONS.map((opt) => (
        <Pressable
          key={opt.value}
          style={[styles.row, fps === opt.value && styles.rowSelected]}
          onPress={() => setFps(opt.value)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{opt.label}</Text>
            <Text style={styles.hint}>{opt.description}</Text>
          </View>
          <View style={[styles.radio, fps === opt.value && styles.radioSelected]} />
        </Pressable>
      ))}
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.medium,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
    marginBottom: spacing.small,
  },
  rowSelected: { borderColor: colors.brand.primary },
  label: { color: colors.text.primary.onDark, fontSize: typography.body.fontSize },
  hint: { color: colors.text.muted, fontSize: typography.caption.fontSize, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.text.muted },
  radioSelected: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary },
});

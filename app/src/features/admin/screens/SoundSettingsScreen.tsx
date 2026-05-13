import { View, Text, Switch, StyleSheet } from 'react-native';

import { PlaceholderScreen } from '@/shared/ui/PlaceholderScreen';
import { colors, typography, spacing, radius } from '@/config/theme';
import { useSettingsStore } from '@/stores/settings';

export function SoundSettingsScreen() {
  const sound = useSettingsStore((s) => s.soundEnabled);
  const haptics = useSettingsStore((s) => s.hapticsEnabled);
  const setSound = useSettingsStore((s) => s.setSound);
  const setHaptics = useSettingsStore((s) => s.setHaptics);

  return (
    <PlaceholderScreen
      title="Sound & Haptics"
      subtitle="Audio + vibration feedback on successful punches."
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Beep on successful punch</Text>
          <Text style={styles.hint}>Soft confirmation chime</Text>
        </View>
        <Switch
          value={sound}
          onValueChange={setSound}
          trackColor={{ true: colors.brand.primary, false: colors.surface.dark.input }}
          thumbColor={colors.text.primary.onDark}
        />
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Haptic vibration on success</Text>
          <Text style={styles.hint}>Brief 50ms vibration</Text>
        </View>
        <Switch
          value={haptics}
          onValueChange={setHaptics}
          trackColor={{ true: colors.brand.primary, false: colors.surface.dark.input }}
          thumbColor={colors.text.primary.onDark}
        />
      </View>
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
  label: { color: colors.text.primary.onDark, fontSize: typography.body.fontSize },
  hint: { color: colors.text.muted, fontSize: typography.caption.fontSize, marginTop: 2 },
});

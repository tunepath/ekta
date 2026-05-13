import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { PlaceholderScreen } from '@/shared/ui/PlaceholderScreen';
import { colors, typography, spacing, radius } from '@/config/theme';
import { useSettingsStore } from '@/stores/settings';

const STEPS = [0.45, 0.5, 0.55, 0.6, 0.65];

export function AdvancedSettingsScreen() {
  const threshold = useSettingsStore((s) => s.matchThreshold);
  const setThreshold = useSettingsStore((s) => s.setMatchThreshold);

  return (
    <PlaceholderScreen
      title="Advanced"
      subtitle="Caution — these settings affect recognition accuracy."
    >
      <Text style={styles.label}>Match threshold: {threshold.toFixed(2)}</Text>
      <Text style={styles.hint}>
        Lower = more permissive (more false-accepts). Higher = stricter (more false-rejects).
        Default is 0.55.
      </Text>
      <View style={styles.row}>
        {STEPS.map((s) => (
          <Pressable
            key={s}
            style={[styles.chip, threshold === s && styles.chipSelected]}
            onPress={() => setThreshold(s)}
          >
            <Text
              style={[styles.chipText, threshold === s && styles.chipTextSelected]}
            >
              {s.toFixed(2)}
            </Text>
          </Pressable>
        ))}
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text.primary.onDark, fontSize: typography.body.fontSize, fontWeight: '600' },
  hint: { color: colors.text.muted, fontSize: typography.caption.fontSize, marginTop: spacing.small },
  row: { flexDirection: 'row', gap: spacing.small, marginTop: spacing.medium, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
  },
  chipSelected: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { color: colors.text.primary.onDark, fontSize: typography.body.fontSize },
  chipTextSelected: { color: colors.text.onPrimary, fontWeight: '600' },
});

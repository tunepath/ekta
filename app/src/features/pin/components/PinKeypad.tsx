import { View, Text, Pressable, StyleSheet } from 'react-native';

import { colors, typography, radius, spacing } from '@/config/theme';

type Props = {
  onKey: (key: string) => void;
  disabled?: boolean;
};

const KEYS: (string | null)[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', '⌫'];

export function PinKeypad({ onKey, disabled }: Props) {
  return (
    <View style={styles.keypad}>
      {KEYS.map((key, i) =>
        key ? (
          <Pressable
            key={i}
            style={[styles.key, disabled && styles.keyDisabled]}
            onPress={() => onKey(key)}
            disabled={disabled}
            android_ripple={{ color: '#ffffff20' }}
          >
            <Text style={styles.keyText}>{key}</Text>
          </Pressable>
        ) : (
          <View key={i} style={[styles.key, { opacity: 0 }]} />
        )
      )}
    </View>
  );
}

type SlotsProps = { length: number; filled: number };

export function PinSlots({ length, filled }: SlotsProps) {
  return (
    <View style={styles.slots}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[styles.slot, i < filled && styles.slotFilled]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.pagePadding,
    gap: 8,
    justifyContent: 'space-between',
  },
  key: {
    width: '31%',
    paddingVertical: 18,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.input,
    alignItems: 'center',
  },
  keyDisabled: { opacity: 0.4 },
  keyText: { fontSize: 24, color: colors.text.primary.onDark, fontWeight: '500' },
  slots: { flexDirection: 'row', gap: 12, marginTop: spacing.small },
  slot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.text.muted,
  },
  slotFilled: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
});

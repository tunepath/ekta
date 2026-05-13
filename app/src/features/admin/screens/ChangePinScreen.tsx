import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, radius, shadow } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { PinKeypad, PinSlots } from '@/features/pin/components/PinKeypad';
import { useAdminPinStore } from '@/stores/adminPin';
import { useSessionStore } from '@/stores/session';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChangePin'>;
type Step = 'current' | 'new' | 'confirm';
const PIN_LENGTH = 6;

export function ChangePinScreen() {
  const nav = useNavigation<Nav>();
  const admin = useSessionStore((s) => s.admin);
  const verifyPin = useAdminPinStore((s) => s.verifyPin);
  const setPin = useAdminPinStore((s) => s.setPin);

  const [step, setStep] = useState<Step>('current');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  function handleKey(key: string) {
    const map = { current: [current, setCurrent], new: [next, setNext], confirm: [confirm, setConfirm] } as const;
    const [value, setter] = map[step] as readonly [string, (v: string) => void];
    if (key === 'CLEAR') setter('');
    else if (key === '⌫') setter(value.slice(0, -1));
    else if (value.length < PIN_LENGTH) setter(value + key);
  }

  async function handleContinue() {
    if (!admin) return;
    if (step === 'current') {
      if (current.length !== PIN_LENGTH) return;
      const r = await verifyPin(admin.email, current);
      if (!r.ok) {
        Alert.alert('Wrong PIN', 'Please re-enter your current PIN.');
        setCurrent('');
        return;
      }
      setStep('new');
    } else if (step === 'new') {
      if (next.length !== PIN_LENGTH) return;
      if (next === current) {
        Alert.alert('Same PIN', 'The new PIN must be different from your current PIN.');
        setNext('');
        return;
      }
      setStep('confirm');
    } else {
      if (confirm !== next) {
        Alert.alert('PINs don’t match', 'Please re-enter your new PIN.');
        setConfirm('');
        return;
      }
      await setPin(admin.email, next);
      Alert.alert('PIN updated', 'Your PIN has been changed.', [
        { text: 'OK', onPress: () => nav.goBack() },
      ]);
    }
  }

  const current_value = step === 'current' ? current : step === 'new' ? next : confirm;
  const heading =
    step === 'current' ? 'Enter current PIN' : step === 'new' ? 'Choose a new 6-digit PIN' : 'Confirm new PIN';

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Change PIN</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.heading}>{heading}</Text>
        <PinSlots length={PIN_LENGTH} filled={current_value.length} />
      </View>

      <PinKeypad onKey={handleKey} />

      <Pressable
        style={[styles.primary, shadow.primaryButton, current_value.length !== PIN_LENGTH && styles.disabled]}
        disabled={current_value.length !== PIN_LENGTH}
        onPress={handleContinue}
      >
        <Text style={styles.primaryText}>{step === 'confirm' ? 'Save' : 'Continue'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.dark.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pagePadding,
    paddingVertical: spacing.small,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.text.primary.onDark, fontSize: 28 },
  headerTitle: { fontSize: typography.heading2.fontSize, color: colors.text.primary.onDark, fontWeight: '600' },
  panel: {
    margin: spacing.pagePadding,
    padding: spacing.large,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
    alignItems: 'center',
    gap: spacing.medium,
  },
  heading: { fontSize: typography.heading2.fontSize, color: colors.text.primary.onDark, fontWeight: '600' },
  primary: {
    margin: spacing.pagePadding,
    paddingVertical: 16,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  primaryText: { fontSize: typography.button.fontSize, fontWeight: '600', color: colors.text.onPrimary },
});

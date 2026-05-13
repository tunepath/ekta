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

type Nav = NativeStackNavigationProp<RootStackParamList, 'PinSetup'>;
const PIN_LENGTH = 6;
type Step = 'choose' | 'confirm';

export function PinSetupScreen() {
  const nav = useNavigation<Nav>();
  const admin = useSessionStore((s) => s.admin);
  const setPinFn = useAdminPinStore((s) => s.setPin);

  const [step, setStep] = useState<Step>('choose');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');

  function handleKey(key: string) {
    const current = step === 'choose' ? pin : confirm;
    const setter = step === 'choose' ? setPin : setConfirm;
    if (key === 'CLEAR') setter('');
    else if (key === '⌫') setter(current.slice(0, -1));
    else if (current.length < PIN_LENGTH) setter(current + key);
  }

  async function handleContinue() {
    if (step === 'choose') {
      if (pin.length !== PIN_LENGTH) return;
      setStep('confirm');
      return;
    }
    if (confirm !== pin) {
      Alert.alert('PINs don’t match', 'Please re-enter your new PIN.');
      setConfirm('');
      return;
    }
    if (!admin) {
      Alert.alert('Session error', 'Please sign in again.');
      nav.replace('SignIn');
      return;
    }
    await setPinFn(admin.email, pin);
    nav.replace('Idle');
  }

  const currentLength = step === 'choose' ? pin.length : confirm.length;
  const canContinue = currentLength === PIN_LENGTH;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Set up your PIN</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.heading}>
          {step === 'choose' ? 'Choose a 6-digit PIN' : 'Confirm your PIN'}
        </Text>
        <Text style={styles.subheading}>
          {step === 'choose'
            ? 'This PIN unlocks the admin menu. Keep it private.'
            : 'Enter the same PIN to confirm.'}
        </Text>
        <PinSlots length={PIN_LENGTH} filled={currentLength} />
      </View>

      <PinKeypad onKey={handleKey} />

      <Pressable
        style={[styles.primary, shadow.primaryButton, !canContinue && styles.disabled]}
        disabled={!canContinue}
        onPress={handleContinue}
      >
        <Text style={styles.primaryText}>
          {step === 'choose' ? 'Continue' : 'Set PIN'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.dark.bg },
  header: { padding: spacing.pagePadding },
  headerTitle: {
    fontSize: typography.heading2.fontSize,
    fontWeight: typography.heading2.fontWeight as '600',
    color: colors.text.primary.onDark,
  },
  panel: {
    margin: spacing.pagePadding,
    padding: spacing.large,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
    alignItems: 'center',
    gap: spacing.small,
  },
  icon: { fontSize: 28, color: colors.brand.primary },
  heading: { fontSize: typography.heading2.fontSize, color: colors.text.primary.onDark, fontWeight: '600' },
  subheading: { fontSize: typography.body.fontSize, color: colors.text.muted, textAlign: 'center' },
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

import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, radius } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { PinKeypad, PinSlots } from '@/features/pin/components/PinKeypad';
import { useAdminPinStore } from '@/stores/adminPin';
import { useSessionStore } from '@/stores/session';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Pin'>;
const PIN_LENGTH = 6;

export function PinScreen() {
  const nav = useNavigation<Nav>();
  const admin = useSessionStore((s) => s.admin);
  const verifyPin = useAdminPinStore((s) => s.verifyPin);
  const cooldownUntil = useAdminPinStore((s) => s.cooldownUntil);
  const failedAttempts = useAdminPinStore((s) => s.failedAttempts);

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!cooldownUntil) {
      setRemainingMs(0);
      return;
    }
    const tick = () => {
      const r = Math.max(0, cooldownUntil - Date.now());
      setRemainingMs(r);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const inCooldown = remainingMs > 0;

  function handleKey(key: string) {
    if (inCooldown) return;
    setError(null);
    if (key === 'CLEAR') setPin('');
    else if (key === '⌫') setPin((p) => p.slice(0, -1));
    else if (pin.length < PIN_LENGTH) setPin((p) => p + key);
  }

  async function handleUnlock() {
    if (!admin) return;
    if (pin.length !== PIN_LENGTH) return;
    const r = await verifyPin(admin.email, pin);
    if (r.ok) {
      setPin('');
      nav.replace('AdminMenu');
    } else if (r.reason === 'cooldown') {
      setPin('');
      setError(`Too many attempts. Try again in 60 seconds.`);
    } else {
      setPin('');
      setError(`Wrong PIN. ${5 - useAdminPinStore.getState().failedAttempts} attempts left.`);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Admin</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.heading}>Enter PIN</Text>
        <Text style={styles.subheading}>Verify admin access to continue</Text>
        <PinSlots length={PIN_LENGTH} filled={pin.length} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {inCooldown ? (
          <Text style={styles.cooldownText}>
            Locked for {Math.ceil(remainingMs / 1000)}s
          </Text>
        ) : null}
      </View>

      <PinKeypad onKey={handleKey} disabled={inCooldown} />

      <View style={styles.actions}>
        <Pressable onPress={() => nav.navigate('ForgotPin' as never)}>
          <Text style={styles.linkText}>Forgot PIN?</Text>
        </Pressable>
        <Pressable
          style={[
            styles.unlockBtn,
            (pin.length !== PIN_LENGTH || inCooldown) && styles.disabled,
          ]}
          onPress={handleUnlock}
          disabled={pin.length !== PIN_LENGTH || inCooldown}
        >
          <Text style={styles.unlockBtnText}>Unlock</Text>
        </Pressable>
      </View>
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
    gap: spacing.small,
  },
  icon: { fontSize: 28, color: colors.brand.primary },
  heading: { fontSize: typography.heading2.fontSize, color: colors.text.primary.onDark, fontWeight: '600' },
  subheading: { fontSize: typography.body.fontSize, color: colors.text.muted },
  errorText: { fontSize: typography.caption.fontSize, color: colors.status.error, marginTop: spacing.small },
  cooldownText: { fontSize: typography.body.fontSize, color: colors.brand.primary, marginTop: spacing.small },
  actions: {
    padding: spacing.pagePadding,
    gap: spacing.medium,
  },
  linkText: { color: colors.brand.primary, textAlign: 'center', fontSize: typography.body.fontSize },
  unlockBtn: {
    paddingVertical: 16,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  unlockBtnText: { fontSize: typography.button.fontSize, fontWeight: '600', color: colors.text.onPrimary },
});

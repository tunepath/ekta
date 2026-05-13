import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, radius, shadow } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useSessionStore } from '@/stores/session';
import { serverLogout } from '@/services/api/auth';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Logout'>;

export function LogoutScreen() {
  const nav = useNavigation<Nav>();
  const clearSession = useSessionStore((s) => s.clearSession);
  const token = useSessionStore((s) => s.token);
  const [logging, setLogging] = useState(false);

  async function confirmLogout() {
    setLogging(true);
    if (token) await serverLogout(token);
    await clearSession();
    nav.reset({ index: 0, routes: [{ name: 'SignIn' }] });
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn} disabled={logging}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Logout</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        <View style={styles.illustration}>
          <Text style={styles.lockEmoji}>🔓</Text>
        </View>
        <Text style={styles.title}>Are you sure{'\n'}you want to log out?</Text>

        <Pressable
          style={[styles.primary, shadow.primaryButton, logging && styles.disabled]}
          onPress={confirmLogout}
          disabled={logging}
        >
          {logging ? (
            <ActivityIndicator color={colors.text.onPrimary} />
          ) : (
            <Text style={styles.primaryText}>Log Out</Text>
          )}
        </Pressable>

        <Pressable style={styles.secondary} onPress={() => nav.goBack()} disabled={logging}>
          <Text style={styles.secondaryText}>Stay Logged In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.light.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pagePadding,
    paddingVertical: spacing.small,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.brand.primary, fontSize: 28 },
  headerTitle: { fontSize: typography.heading2.fontSize, color: colors.brand.primary, fontWeight: '600' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.pagePadding,
    gap: spacing.large,
  },
  illustration: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(255,180,34,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: { fontSize: 80 },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary.onLight,
    textAlign: 'center',
    marginVertical: spacing.large,
  },
  primary: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  primaryText: { fontSize: typography.button.fontSize, fontWeight: '600', color: colors.text.onPrimary },
  secondary: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  secondaryText: { fontSize: typography.button.fontSize, color: colors.text.muted, fontWeight: '500' },
});

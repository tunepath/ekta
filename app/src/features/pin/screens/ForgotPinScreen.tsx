import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, radius, shadow } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { login } from '@/services/api/auth';
import { useSessionStore } from '@/stores/session';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Pin'>;

/**
 * Forgot PIN — re-verifies the admin's HRMS password via the login API
 * (no separate "verify password" endpoint needed). On success, routes to
 * PinSetup so admin can choose a new PIN.
 */
export function ForgotPinScreen() {
  const nav = useNavigation<Nav>();
  const admin = useSessionStore((s) => s.admin);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function handleVerify() {
    if (!admin || !password) return;
    setVerifying(true);
    try {
      const r = await login(admin.email, password);
      if (r.user.email.toLowerCase() !== admin.email.toLowerCase()) {
        Alert.alert('Verification failed', 'This password did not match your account.');
        return;
      }
      // Update tokens since the login call rotated them
      await useSessionStore.getState().setSession(r.token, r.refresh_token, r.user);
      nav.replace('PinSetup');
    } catch {
      Alert.alert('Verification failed', 'Wrong password. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Reset PIN</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        <Text style={styles.heading}>Verify your identity</Text>
        <Text style={styles.subheading}>
          To reset your PIN, please re-enter your ektaHR password.
        </Text>

        <View style={styles.field}>
          <TextInput
            style={styles.input}
            placeholder="ektaHR password"
            placeholderTextColor={colors.text.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!verifying}
          />
        </View>

        <Pressable
          style={[styles.primary, shadow.primaryButton, (!password || verifying) && styles.disabled]}
          disabled={!password || verifying}
          onPress={handleVerify}
        >
          {verifying ? (
            <ActivityIndicator color={colors.text.onPrimary} />
          ) : (
            <Text style={styles.primaryText}>Continue</Text>
          )}
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
  body: { padding: spacing.pagePadding, gap: spacing.large },
  heading: { fontSize: typography.display.fontSize, fontWeight: '600', color: colors.text.primary.onDark },
  subheading: { fontSize: typography.body.fontSize, color: colors.text.muted },
  field: {
    backgroundColor: colors.surface.dark.input,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: { color: colors.text.primary.onDark, fontSize: typography.body.fontSize },
  primary: {
    paddingVertical: 16,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  primaryText: { fontSize: typography.button.fontSize, fontWeight: '600', color: colors.text.onPrimary },
});

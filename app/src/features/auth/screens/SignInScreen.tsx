import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';

import { colors, typography, spacing, radius, shadow } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { useKioskStore } from '@/stores/kiosk';
import { SecureKeys, secureGet } from '@/services/secure/storage';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

const FORGOT_PASSWORD_URL = 'https://ektahr.example.com/forgot-password';

export function SignInScreen() {
  const nav = useNavigation<Nav>();
  const office = useKioskStore((s) => s.office);
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Pre-fill last-used email (A1 — "remember email")
  useEffect(() => {
    secureGet(SecureKeys.AdminEmail).then((v) => v && setEmail(v));
  }, []);

  function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          // Route by setup state
          if (!office) {
            nav.replace('KioskIdentity');
          } else {
            // Phase 2 routes per-admin PIN setup-or-entry
            nav.replace('PinSetup');
          }
        },
        onError: (err: any) => {
          const msg =
            err?.message === 'not_kiosk_admin'
              ? 'This account is not a Kiosk Admin. Please contact HR.'
              : err?.response?.data?.error === 'invalid_credentials'
              ? 'Invalid email or password.'
              : 'Login failed. Please check your network and try again.';
          Alert.alert('Sign in', msg);
        },
      }
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBand} />
      <View style={styles.bottomBand} />

      <View style={styles.content}>
        <Text style={styles.welcome}>Welcome Back!</Text>

        <View style={styles.card}>
          <Text style={styles.logo}>ekta</Text>
          <Text style={styles.signIn}>Sign In</Text>

          <View style={styles.field}>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!login.isPending}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={colors.text.placeholder}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!login.isPending}
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => WebBrowser.openBrowserAsync(FORGOT_PASSWORD_URL)}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </Pressable>

          <Pressable
            style={[
              styles.loginButton,
              shadow.primaryButton,
              login.isPending && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={login.isPending}
          >
            {login.isPending ? (
              <ActivityIndicator color={colors.text.onPrimary} />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>© 2026 EktaHr. All rights reserved.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.dark.bg },
  topBand: {
    position: 'absolute',
    top: -108,
    left: -119,
    right: -119,
    height: 453,
    backgroundColor: colors.brand.primary,
    borderRadius: 309,
  },
  bottomBand: {
    position: 'absolute',
    bottom: -108,
    left: -119,
    right: -119,
    height: 627,
    backgroundColor: colors.surface.dark.bg,
    borderRadius: 309,
  },
  content: { flex: 1, paddingHorizontal: spacing.pagePadding, justifyContent: 'center' },
  welcome: {
    fontSize: typography.display.fontSize,
    fontWeight: typography.display.fontWeight as '600',
    letterSpacing: typography.display.letterSpacing,
    color: colors.surface.dark.bg,
    textAlign: 'center',
    marginBottom: spacing.medium,
  },
  card: {
    backgroundColor: colors.surface.dark.card,
    borderColor: colors.border.subtleOnDark,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    gap: spacing.large,
    ...shadow.card,
  },
  logo: { fontSize: 48, fontWeight: '700', color: colors.text.primary.onDark, textAlign: 'center' },
  signIn: { fontSize: typography.body.fontSize, color: colors.text.primary.onDark, textAlign: 'center' },
  field: {
    backgroundColor: colors.surface.dark.input,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, color: colors.text.primary.onDark, fontSize: typography.body.fontSize },
  eyeBtn: { padding: 4 },
  eyeText: { fontSize: 18 },
  forgotLink: {
    color: colors.brand.primary,
    fontWeight: '500',
    textAlign: 'right',
    fontSize: typography.body.fontSize,
  },
  loginButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.input,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: {
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight as '600',
    color: colors.text.onPrimary,
  },
  footer: { color: colors.text.muted, opacity: 0.4, textAlign: 'center', marginTop: spacing.large },
});

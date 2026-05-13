import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, radius, shadow } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ConsentBiometric'>;

/**
 * Biometric consent screen — shown before face enrollment per DPDP Act 2023.
 * Recorded server-side for audit when the admin proceeds.
 */
export function ConsentBiometricScreen() {
  const nav = useNavigation<Nav>();
  const [agreed, setAgreed] = useState(false);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Biometric Consent</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.heading}>
          Before enrolling this employee's face
        </Text>

        <Text style={styles.paragraph}>
          The Digital Personal Data Protection Act, 2023 classifies facial biometric data
          as sensitive personal data. By proceeding, you confirm that:
        </Text>

        <Section
          title="The employee has consented"
          body="The employee has been informed that their face will be captured, converted to a numeric template (embedding), and stored on the ektaHR server."
        />
        <Section
          title="Purpose is limited to attendance"
          body="The embedding is used only to mark attendance at registered kiosks. It will not be used for training models, analytics, or shared with third parties."
        />
        <Section
          title="Retention + deletion"
          body="The employee can request deletion of their biometric data at any time through HR. Deleting deactivates kiosk recognition."
        />
        <Section
          title="What is stored"
          body="A 128-dimension embedding (numeric vector) + a reference photo from the front-facing capture. The kiosk caches embeddings locally; raw photos are not stored on the kiosk."
        />

        <View style={styles.agreeRow}>
          <Switch
            value={agreed}
            onValueChange={setAgreed}
            trackColor={{ true: colors.brand.primary, false: colors.surface.dark.input }}
            thumbColor={colors.text.primary.onDark}
          />
          <Text style={styles.agreeText}>
            The employee has given informed consent for biometric enrollment.
          </Text>
        </View>
      </ScrollView>

      <Pressable
        style={[styles.primary, shadow.primaryButton, !agreed && styles.disabled]}
        disabled={!agreed}
        onPress={() => nav.replace('EnrollFace')}
      >
        <Text style={styles.primaryText}>Continue to enrollment</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
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
  body: { flex: 1 },
  bodyContent: { padding: spacing.pagePadding, gap: spacing.medium },
  heading: { fontSize: typography.heading2.fontSize, fontWeight: '600', color: colors.text.primary.onDark },
  paragraph: { fontSize: typography.body.fontSize, color: colors.text.muted, lineHeight: 22 },
  section: {
    padding: spacing.medium,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
  },
  sectionTitle: { color: colors.text.primary.onDark, fontWeight: '600', fontSize: typography.body.fontSize },
  sectionBody: { color: colors.text.muted, fontSize: typography.caption.fontSize, marginTop: 4, lineHeight: 18 },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.medium,
    paddingVertical: spacing.medium,
  },
  agreeText: { flex: 1, color: colors.text.primary.onDark, fontSize: typography.body.fontSize, lineHeight: 22 },
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

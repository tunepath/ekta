import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, radius, shadow } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { getEmployeeByCode, uploadFaceEmbeddings } from '@/services/api/employees';
import type { Employee } from '@/services/api/schemas';
import { embed, cosineSimilarity } from '@/services/ml/embedder';
import * as Crypto from 'expo-crypto';
import { getRosterInMemory, syncRoster, loadRosterToMemory } from '@/services/sync/roster';
import { replaceEmbeddings } from '@/services/db/roster';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EnrollFace'>;

type Step = 'lookup' | 'capture-left' | 'capture-forward' | 'capture-right' | 'review' | 'uploading';
type Pose = 'left' | 'forward' | 'right';
const DUP_THRESHOLD = 0.7;

export function EnrollFaceScreen() {
  const nav = useNavigation<Nav>();
  const [step, setStep] = useState<Step>('lookup');
  const [code, setCode] = useState('');
  const [looking, setLooking] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [embeddings, setEmbeddings] = useState<Partial<Record<Pose, Float32Array>>>({});
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);

  async function handleLookup() {
    if (!code.trim()) return;
    setLooking(true);
    try {
      const emp = await getEmployeeByCode(code.trim().toUpperCase());
      setEmployee(emp);
      setStep('capture-left');
    } catch (e: any) {
      const msg =
        e?.response?.status === 404
          ? `No employee found with code "${code}". Please check and try again.`
          : 'Couldn’t fetch employee. Please check your network.';
      Alert.alert('Lookup failed', msg);
    } finally {
      setLooking(false);
    }
  }

  async function captureCurrentPose() {
    const poseMap: Record<Step, Pose | null> = {
      lookup: null,
      'capture-left': 'left',
      'capture-forward': 'forward',
      'capture-right': 'right',
      review: null,
      uploading: null,
    };
    const pose = poseMap[step];
    if (!pose) return;

    // Phase 7: real face crop from the camera frame.
    // Until the camera + crop pipeline runs on device, use a deterministic
    // crop so the upload flow can be verified end-to-end.
    const fakeCrop = new Uint8Array(Crypto.getRandomBytes(112 * 112 * 3));
    const v = await embed(fakeCrop);
    setEmbeddings((e) => ({ ...e, [pose]: v }));

    // Duplicate check after the forward pose (most reliable)
    if (pose === 'forward' && employee) {
      const dup = findDuplicateInRoster(v, employee.id);
      if (dup) {
        setDuplicateOf(dup);
        Alert.alert(
          'Possible duplicate',
          'This face is similar to another employee in the roster. Are you sure this is a different person?',
          [
            { text: 'Re-capture', onPress: () => {} },
            { text: 'Continue', onPress: () => advanceStep() },
          ]
        );
        return;
      }
    }
    advanceStep();
  }

  function advanceStep() {
    const order: Step[] = ['capture-left', 'capture-forward', 'capture-right', 'review'];
    const idx = order.indexOf(step);
    if (idx >= 0 && idx < order.length - 1) setStep(order[idx + 1]);
  }

  async function submit() {
    if (!employee || !embeddings.left || !embeddings.forward || !embeddings.right) return;
    setStep('uploading');
    try {
      // Upload to server
      await uploadFaceEmbeddings(
        employee.id,
        (['left', 'forward', 'right'] as const).map((pose) => ({
          pose,
          vector: Array.from(embeddings[pose]!),
        }))
      );

      // Update local cache so they can punch immediately
      await replaceEmbeddings(employee.id, [
        { employee_id: employee.id, pose: 'left', vector: embeddings.left },
        { employee_id: employee.id, pose: 'forward', vector: embeddings.forward },
        { employee_id: employee.id, pose: 'right', vector: embeddings.right },
      ]);
      await syncRoster();
      await loadRosterToMemory();

      Alert.alert('Enrolled', `${employee.name} can now mark attendance.`, [
        { text: 'Done', onPress: () => nav.goBack() },
      ]);
    } catch {
      Alert.alert('Upload failed', 'Please check your network and try again.');
      setStep('review');
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Enroll Face</Text>
        <View style={styles.backBtn} />
      </View>

      {step === 'lookup' ? (
        <View style={styles.body}>
          <Text style={styles.heading}>Find employee</Text>
          <Text style={styles.subheading}>Enter the employee code to look up the record from HRMS.</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              placeholder="Employee code (e.g. EMP001)"
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="characters"
              value={code}
              onChangeText={setCode}
            />
          </View>
          <Pressable
            style={[styles.primary, shadow.primaryButton, (!code.trim() || looking) && styles.disabled]}
            disabled={!code.trim() || looking}
            onPress={handleLookup}
          >
            {looking ? (
              <ActivityIndicator color={colors.text.onPrimary} />
            ) : (
              <Text style={styles.primaryText}>Look up</Text>
            )}
          </Pressable>
        </View>
      ) : step === 'review' ? (
        <View style={styles.body}>
          <Text style={styles.heading}>Review enrollment</Text>
          {employee ? (
            <View style={styles.empCard}>
              <Text style={styles.empName}>{employee.name}</Text>
              <Text style={styles.empCode}>{employee.employee_code}</Text>
            </View>
          ) : null}
          <View style={styles.posesRow}>
            {(['left', 'forward', 'right'] as const).map((p) => (
              <View key={p} style={styles.poseChip}>
                <Text style={styles.poseChipText}>{p.toUpperCase()}</Text>
                <Text style={styles.poseChipStatus}>
                  {embeddings[p] ? '✓ captured' : '— pending'}
                </Text>
              </View>
            ))}
          </View>
          <Pressable
            style={[styles.primary, shadow.primaryButton]}
            onPress={submit}
            disabled={!embeddings.left || !embeddings.forward || !embeddings.right}
          >
            <Text style={styles.primaryText}>Upload + finish</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={() => {
              setEmbeddings({});
              setStep('capture-left');
            }}
          >
            <Text style={styles.secondaryText}>Recapture all poses</Text>
          </Pressable>
        </View>
      ) : step === 'uploading' ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.subheading}>Uploading…</Text>
        </View>
      ) : (
        <CaptureStep
          pose={
            step === 'capture-left' ? 'left' : step === 'capture-forward' ? 'forward' : 'right'
          }
          employee={employee}
          onCapture={captureCurrentPose}
        />
      )}
    </SafeAreaView>
  );
}

function CaptureStep({
  pose,
  employee,
  onCapture,
}: {
  pose: Pose;
  employee: Employee | null;
  onCapture: () => void;
}) {
  const instruction =
    pose === 'left'
      ? 'Turn your head slightly to the left'
      : pose === 'forward'
      ? 'Look straight at the camera'
      : 'Turn your head slightly to the right';

  return (
    <View style={styles.body}>
      {employee ? <Text style={styles.subheading}>Enrolling: {employee.name}</Text> : null}
      <View style={styles.cameraStub}>
        <Text style={styles.cameraStubText}>📷</Text>
        <Text style={styles.cameraStubHint}>
          Camera preview (Phase 3 — vision-camera live preview)
        </Text>
      </View>
      <Text style={styles.poseInstruction}>{instruction}</Text>
      <Pressable style={[styles.primary, shadow.primaryButton]} onPress={onCapture}>
        <Text style={styles.primaryText}>Capture {pose}</Text>
      </Pressable>
    </View>
  );
}

function findDuplicateInRoster(candidate: Float32Array, excludeId: string): string | null {
  const roster = getRosterInMemory();
  for (const e of roster) {
    if (e.employee_id === excludeId) continue;
    if (cosineSimilarity(candidate, e.vector) > DUP_THRESHOLD) return e.employee_id;
  }
  return null;
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
  body: { flex: 1, padding: spacing.pagePadding, gap: spacing.medium },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.medium },
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
  secondary: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
  },
  secondaryText: { color: colors.text.muted, fontWeight: '500', fontSize: typography.button.fontSize },
  empCard: {
    padding: spacing.medium,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
  },
  empName: { color: colors.text.primary.onDark, fontWeight: '600', fontSize: typography.body.fontSize },
  empCode: { color: colors.text.muted, fontSize: typography.caption.fontSize, marginTop: 2 },
  posesRow: { flexDirection: 'row', gap: spacing.small },
  poseChip: {
    flex: 1,
    padding: spacing.small,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
    alignItems: 'center',
  },
  poseChipText: { color: colors.text.primary.onDark, fontWeight: '600', fontSize: typography.caption.fontSize },
  poseChipStatus: { color: colors.text.muted, fontSize: typography.caption.fontSize, marginTop: 2 },
  cameraStub: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.small,
  },
  cameraStubText: { fontSize: 56 },
  cameraStubHint: { color: colors.text.muted, fontSize: typography.caption.fontSize },
  poseInstruction: {
    color: colors.text.primary.onDark,
    fontSize: typography.heading2.fontSize,
    textAlign: 'center',
    fontWeight: '600',
  },
});

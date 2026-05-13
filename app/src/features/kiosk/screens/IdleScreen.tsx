import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ToastAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';

import { colors, typography, spacing, radius } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useFaceDetector } from '@/services/recognition/useFaceDetector';
import { LivenessTracker, hintFor } from '@/services/recognition/liveness';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePunch } from '@/features/kiosk/hooks/usePunch';
import { getRosterInMemory, loadRosterToMemory, syncRoster } from '@/services/sync/roster';
import { embed } from '@/services/ml/embedder';
import * as Crypto from 'expo-crypto';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Idle'>;
type PunchType = 'in' | 'out';

const DIM_AFTER_NO_FACE_MS = 60_000;

export function IdleScreen() {
  const nav = useNavigation<Nav>();
  const online = useNetworkStatus();
  const punch = usePunch();
  const detection = useFaceDetector();
  const livenessRef = useRef(new LivenessTracker());

  const [selected, setSelected] = useState<PunchType | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const lastFaceAt = useRef<number>(Date.now());

  useKeepAwake();

  // Roster sync on mount
  useFocusEffect(
    useCallback(() => {
      syncRoster().then(() => loadRosterToMemory()).catch((e) => console.warn('roster sync failed', e));
      livenessRef.current.reset();
      return () => {};
    }, [])
  );

  // Detection loop — hints + liveness + trigger
  useEffect(() => {
    if (detection.faceCount > 0) lastFaceAt.current = Date.now();

    // Hint UI (per A3)
    const { message } = hintFor(detection);
    setHintText(message);

    if (!online || !selected || processing) return;

    const liveness = livenessRef.current.update(detection, Date.now());
    if (liveness.kind === 'passed' && detection.primary) {
      void triggerPunch();
    }
  }, [detection, selected, online, processing]);

  // Dim-after-60s
  useEffect(() => {
    const id = setInterval(() => {
      const dim = Date.now() - lastFaceAt.current > DIM_AFTER_NO_FACE_MS;
      setDimmed(dim);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const triggerPunch = useCallback(async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      // Phase 5: real face crop from the camera frame.
      // The frame processor will call `pushDetection` AND provide a cropped
      // RGB buffer for embedding. Until that wiring lands, we use a
      // deterministic mock crop so the pipeline can be unit-tested end-to-end.
      const fakeCrop = new Uint8Array(Crypto.getRandomBytes(112 * 112 * 3));
      const embedding = await embed(fakeCrop);

      const roster = getRosterInMemory();
      if (roster.length === 0) {
        toast('No employees enrolled yet. Use Admin → Enroll Face.');
        setSelected(null);
        livenessRef.current.reset();
        return;
      }

      const r = await punch({ type: selected, embedding, roster });
      if (!r.ok && r.reason === 'no_match') {
        toast('Not recognized — please try again or contact HR.');
        livenessRef.current.reset();
      }
      if (!r.ok && r.reason === 'duplicate_silent') {
        livenessRef.current.reset();
      }
    } finally {
      setProcessing(false);
      setSelected(null);
    }
  }, [punch, selected]);

  return (
    <SafeAreaView style={[styles.root, dimmed && styles.rootDimmed]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <Pressable style={styles.headerBtn} onPress={() => nav.navigate('Pin')}>
          <Text style={styles.lockIcon}>🔒</Text>
        </Pressable>
      </View>

      <View style={styles.cameraStub}>
        <Text style={styles.cameraStubText}>Camera Preview</Text>
        <Text style={styles.cameraStubHint}>
          (vision-camera + ML Kit installs activate live detection)
        </Text>

        <View style={styles.faceGuide} />

        <View style={[styles.statusBadge, !online && styles.statusBadgeOffline]}>
          <View style={[styles.statusDot, !online && styles.statusDotOffline]} />
          <Text style={styles.statusText}>
            {!online
              ? 'OFFLINE — punching disabled'
              : !selected
              ? 'SELECT PUNCH IN / OUT'
              : processing
              ? 'PROCESSING…'
              : `READY • PUNCH ${selected.toUpperCase()}`}
          </Text>
        </View>

        {hintText ? (
          <View style={styles.hint}>
            <Text style={styles.hintText}>{hintText}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, styles.inBtn, selected === 'in' && styles.actionBtnSelected]}
          onPress={() => online && setSelected('in')}
          disabled={!online || processing}
        >
          <Text style={styles.actionText}>PUNCH IN</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.outBtn, selected === 'out' && styles.actionBtnSelected]}
          onPress={() => online && setSelected('out')}
          disabled={!online || processing}
        >
          <Text style={styles.actionText}>PUNCH OUT</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function toast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    // iOS — fall back to console for now; could swap to a toast lib later.
    console.log('[toast]', msg);
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.dark.bg },
  rootDimmed: { opacity: 0.35 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pagePadding,
    paddingVertical: spacing.small,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: typography.heading2.fontSize,
    fontWeight: typography.heading2.fontWeight as '600',
    color: colors.text.primary.onDark,
  },
  lockIcon: { fontSize: 22 },
  cameraStub: {
    flex: 1,
    margin: spacing.pagePadding,
    backgroundColor: '#000',
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraStubText: { color: colors.text.muted, fontSize: typography.heading2.fontSize, fontWeight: '600' },
  cameraStubHint: {
    color: colors.text.muted,
    fontSize: typography.caption.fontSize,
    marginTop: 8,
    opacity: 0.6,
    paddingHorizontal: spacing.medium,
    textAlign: 'center',
  },
  faceGuide: {
    width: 256,
    height: 320,
    borderRadius: 128,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    marginVertical: spacing.large,
  },
  statusBadge: {
    position: 'absolute',
    top: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 8,
  },
  statusBadgeOffline: { backgroundColor: colors.status.error },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand.primary },
  statusDotOffline: { backgroundColor: '#fff' },
  statusText: { fontSize: typography.caption.fontSize, color: colors.text.primary.onDark, fontWeight: '500' },
  hint: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  hintText: { color: colors.text.primary.onDark, fontSize: typography.caption.fontSize },
  actions: {
    flexDirection: 'row',
    gap: spacing.medium,
    paddingHorizontal: spacing.pagePadding,
    paddingBottom: spacing.large,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inBtn: { backgroundColor: 'rgba(34,197,94,0.18)' },
  outBtn: { backgroundColor: 'rgba(255,180,34,0.18)' },
  actionBtnSelected: { borderColor: colors.brand.primary },
  actionText: {
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight as '600',
    color: colors.text.primary.onDark,
    letterSpacing: 1,
  },
});

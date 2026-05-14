import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ToastAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useFaceDetector as useVcFaceDetector } from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';

import { colors, typography, spacing, radius } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useFaceDetector, pushDetection } from '@/services/recognition/useFaceDetector';
import { LivenessTracker, hintFor } from '@/services/recognition/liveness';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePunch } from '@/features/kiosk/hooks/usePunch';
import { getRosterInMemory, loadRosterToMemory, syncRoster } from '@/services/sync/roster';
import { embed, loadEmbedderModel } from '@/services/ml/embedder';
import type { DetectionFrame, FaceLandmarks } from '@/services/recognition/types';
import { setLatestCrop } from '@/services/recognition/frameStore';

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

  const isFocused = useIsFocused();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  useEffect(() => {
    if (!hasPermission) requestPermission().catch(() => {});
  }, [hasPermission, requestPermission]);

  const { detectFaces } = useVcFaceDetector({
    performanceMode: 'fast',
    landmarkMode: 'none',
    classificationMode: 'all',
    minFaceSize: 0.2,
    trackingEnabled: false,
  });
  const { resize } = useResizePlugin();

  // Warm the TFLite model on mount so first punch isn't slowed by the load.
  useEffect(() => {
    loadEmbedderModel().catch(() => {});
  }, []);

  const pushDetectionJs = Worklets.createRunOnJS(pushDetection);
  const pushCropJs = Worklets.createRunOnJS((bytes: ArrayBufferLike) => {
    setLatestCrop(new Uint8Array(bytes as ArrayBuffer));
  });

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const faces = detectFaces(frame);
      const mapped: FaceLandmarks[] = faces.map((f: any) => ({
        bounds: {
          x: f.bounds?.x ?? 0,
          y: f.bounds?.y ?? 0,
          width: f.bounds?.width ?? 0,
          height: f.bounds?.height ?? 0,
        },
        leftEyeOpenProbability: f.leftEyeOpenProbability ?? 1,
        rightEyeOpenProbability: f.rightEyeOpenProbability ?? 1,
        yaw: f.yawAngle ?? 0,
        pitch: f.pitchAngle ?? 0,
        roll: f.rollAngle ?? 0,
      }));
      let primary: FaceLandmarks | null = null;
      for (const m of mapped) {
        if (!primary || m.bounds.width > primary.bounds.width) primary = m;
      }
      const out: DetectionFrame = {
        faceCount: mapped.length,
        primary,
        frameWidth: frame.width,
        frameHeight: frame.height,
      };
      pushDetectionJs(out);

      // When exactly one face is detected, crop it out and ship the 112x112
      // RGB bytes to JS for the embedder.
      if (mapped.length === 1 && primary) {
        // Expand bounds slightly so we get some forehead/chin context.
        const pad = 0.15;
        const w = primary.bounds.width;
        const h = primary.bounds.height;
        const cx = primary.bounds.x + w / 2;
        const cy = primary.bounds.y + h / 2;
        const side = Math.max(w, h) * (1 + pad);
        const cropX = Math.max(0, cx - side / 2);
        const cropY = Math.max(0, cy - side / 2);
        const cropW = Math.min(side, frame.width - cropX);
        const cropH = Math.min(side, frame.height - cropY);
        try {
          const resized = resize(frame, {
            crop: { x: cropX, y: cropY, width: cropW, height: cropH },
            scale: { width: 112, height: 112 },
            pixelFormat: 'rgb',
            dataType: 'uint8',
          });
          pushCropJs(resized.buffer);
        } catch (e) {
          // Resize can fail when bounds straddle the frame edge; ignore.
        }
      }
    },
    [detectFaces, pushDetectionJs, pushCropJs, resize]
  );

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
      const fakeCrop = new Uint8Array(112 * 112 * 3);
      for (let i = 0; i < fakeCrop.length; i++) fakeCrop[i] = Math.floor(Math.random() * 256);
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
        {hasPermission && device && isFocused ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
            pixelFormat="yuv"
          />
        ) : (
          <>
            <Text style={styles.cameraStubText}>Camera Preview</Text>
            <Text style={styles.cameraStubHint}>
              {!hasPermission
                ? 'Grant camera permission to enable live detection.'
                : 'No front camera detected on this device.'}
            </Text>
          </>
        )}

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
          onPress={() => online && nav.navigate('PunchProcessing', { type: 'in' })}
          disabled={!online || processing}
        >
          <Text style={styles.actionText}>PUNCH IN</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.outBtn, selected === 'out' && styles.actionBtnSelected]}
          onPress={() => online && nav.navigate('PunchProcessing', { type: 'out' })}
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

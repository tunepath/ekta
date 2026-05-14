import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useFaceDetector as useVcFaceDetector } from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';

import { colors, typography, spacing, radius, shadow } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { getEmployeeByCode, uploadFaceEmbeddings } from '@/services/api/employees';
import type { Employee } from '@/services/api/schemas';
import { embed, cosineSimilarity } from '@/services/ml/embedder';
import { getRosterInMemory, syncRoster, loadRosterToMemory } from '@/services/sync/roster';
import { replaceEmbeddings, upsertEmployee } from '@/services/db/roster';
import { setLatestCrop, getLatestCrop } from '@/services/recognition/frameStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EnrollFace'>;
type Pose = 'forward' | 'left' | 'right';
type Step = 'lookup' | 'capture' | 'review' | 'uploading';

const POSE_ORDER: Pose[] = ['forward', 'left', 'right'];
const STABILITY_MS = 1500;
const POST_CAPTURE_PAUSE_MS = 800;
const DUP_THRESHOLD = 0.7;

// Pose-detection thresholds (degrees). Tune per device if camera mirroring
// inverts the sign.
const FORWARD_YAW = 12;
const FORWARD_PITCH = 15;
const SIDE_YAW = 20;

const POSE_INSTRUCTION: Record<Pose, string> = {
  forward: 'Look straight at the camera',
  left: 'Turn your head slightly to the left',
  right: 'Turn your head slightly to the right',
};

const POSE_LABEL: Record<Pose, string> = {
  forward: 'Forward',
  left: 'Left',
  right: 'Right',
};

export function EnrollFaceScreen() {
  const nav = useNavigation<Nav>();
  const [step, setStep] = useState<Step>('lookup');
  const [code, setCode] = useState('');
  const [looking, setLooking] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [photos, setPhotos] = useState<Partial<Record<Pose, string>>>({});
  const embeddingsStore = useRef<Partial<Record<Pose, Float32Array>>>({});

  async function handleLookup() {
    if (!code.trim()) return;
    setLooking(true);
    try {
      const emp = await getEmployeeByCode(code.trim().toUpperCase());
      setEmployee(emp);
      await upsertEmployee({
        id: emp.id,
        employee_code: emp.employee_code,
        name: emp.name,
        phone: emp.phone,
        photo_url: emp.photo_url,
        updated_at: Date.now(),
      });
      setStep('capture');
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

  function handleCapturedAll(
    captured: Record<Pose, string>,
    embeddings: Record<Pose, Float32Array>
  ) {
    setPhotos(captured);
    embeddingsStore.current = embeddings;
    setStep('review');
  }

  function handleRetake() {
    setPhotos({});
    embeddingsStore.current = {};
    setStep('capture');
  }

  async function submit() {
    if (!employee || !photos.forward || !photos.left || !photos.right) return;
    const embeddings = embeddingsStore.current;
    if (!embeddings.forward || !embeddings.left || !embeddings.right) {
      Alert.alert('Missing embeddings', 'Please retake enrollment.');
      handleRetake();
      return;
    }
    setStep('uploading');
    try {
      const dup = findDuplicateInRoster(embeddings.forward, employee.id);
      if (dup) {
        setStep('review');
        Alert.alert(
          'Possible duplicate',
          'This face is similar to another employee in the roster. Continue anyway?',
          [
            { text: 'Recapture', onPress: handleRetake },
            { text: 'Continue', onPress: () => doUpload(embeddings as Record<Pose, Float32Array>) },
          ]
        );
        return;
      }

      await doUpload(embeddings as Record<Pose, Float32Array>);
    } catch {
      Alert.alert('Upload failed', 'Please check your network and try again.');
      setStep('review');
    }
  }

  async function doUpload(embeddings: Record<Pose, Float32Array>) {
    if (!employee) return;
    try {
      await uploadFaceEmbeddings(
        employee.id,
        POSE_ORDER.map((p) => ({ pose: p, vector: Array.from(embeddings[p]) }))
      );
      await replaceEmbeddings(employee.id, [
        { employee_id: employee.id, pose: 'left', vector: embeddings.left },
        { employee_id: employee.id, pose: 'forward', vector: embeddings.forward },
        { employee_id: employee.id, pose: 'right', vector: embeddings.right },
      ]);
      await syncRoster();
      await loadRosterToMemory();
      Alert.alert('Enrollment Completed', `${employee.name} can now mark attendance.`, [
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
        <LookupStep
          code={code}
          setCode={setCode}
          looking={looking}
          onLookup={handleLookup}
        />
      ) : step === 'capture' ? (
        <CaptureStep employee={employee} onComplete={handleCapturedAll} />
      ) : step === 'review' ? (
        <ReviewStep
          employee={employee}
          photos={photos as Record<Pose, string>}
          onConfirm={submit}
          onRetake={handleRetake}
        />
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.subheading}>Uploading…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------- Lookup step ----------

function LookupStep({
  code,
  setCode,
  looking,
  onLookup,
}: {
  code: string;
  setCode: (v: string) => void;
  looking: boolean;
  onLookup: () => void;
}) {
  return (
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
        onPress={onLookup}
      >
        {looking ? (
          <ActivityIndicator color={colors.text.onPrimary} />
        ) : (
          <Text style={styles.primaryText}>Look up</Text>
        )}
      </Pressable>
    </View>
  );
}

// ---------- Capture step (auto) ----------

function CaptureStep({
  employee,
  onComplete,
}: {
  employee: Employee | null;
  onComplete: (photos: Record<Pose, string>, embeddings: Record<Pose, Float32Array>) => void;
}) {
  const cameraRef = useRef<Camera>(null);
  const isFocused = useIsFocused();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  useEffect(() => {
    if (!hasPermission) requestPermission().catch(() => {});
  }, [hasPermission, requestPermission]);

  const [poseIndex, setPoseIndex] = useState(0);
  const [statusText, setStatusText] = useState('Position your face inside the guide');
  const [captured, setCaptured] = useState<Partial<Record<Pose, string>>>({});
  const embeddingsRef = useRef<Partial<Record<Pose, Float32Array>>>({});
  const [capturing, setCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const stableSinceRef = useRef<number | null>(null);
  const capturingRef = useRef(false);
  const currentPose = POSE_ORDER[poseIndex] ?? null;
  const completedCount = poseIndex;
  const progressPct = Math.round((completedCount / POSE_ORDER.length) * 100);

  const { detectFaces } = useVcFaceDetector({
    performanceMode: 'fast',
    landmarkMode: 'none',
    classificationMode: 'none',
    minFaceSize: 0.2,
    trackingEnabled: false,
  });
  const { resize } = useResizePlugin();

  const pushCropJs = Worklets.createRunOnJS((bytes: ArrayBufferLike) => {
    setLatestCrop(new Uint8Array(bytes as ArrayBuffer));
  });

  const onFrameJs = Worklets.createRunOnJS(
    (faceCount: number, yaw: number, pitch: number, faceWidth: number) => {
      if (capturingRef.current) return;
      if (!currentPose) return;

      const tooSmall = faceWidth < 120;
      const correctPose = poseMatches(currentPose, yaw, pitch);

      if (faceCount === 0) {
        stableSinceRef.current = null;
        setStatusText('Position your face inside the guide');
        return;
      }
      if (faceCount > 1) {
        stableSinceRef.current = null;
        setStatusText('Please scan one person at a time');
        return;
      }
      if (tooSmall) {
        stableSinceRef.current = null;
        setStatusText('Step closer to the camera');
        return;
      }
      if (!correctPose) {
        stableSinceRef.current = null;
        setStatusText(POSE_INSTRUCTION[currentPose]);
        return;
      }

      // Pose is correct — track stability
      const now = Date.now();
      if (stableSinceRef.current === null) {
        stableSinceRef.current = now;
        setStatusText('Hold still…');
        return;
      }
      const heldFor = now - stableSinceRef.current;
      if (heldFor >= STABILITY_MS) {
        capturingRef.current = true;
        setStatusText(`Capturing ${POSE_LABEL[currentPose]} Face…`);
        void doCapture(currentPose);
      } else {
        const remaining = Math.ceil((STABILITY_MS - heldFor) / 100) / 10;
        setStatusText(`Hold still… ${remaining.toFixed(1)}s`);
      }
    }
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const faces = detectFaces(frame);
      let faceCount = faces.length;
      let yaw = 0;
      let pitch = 0;
      let faceWidth = 0;
      let largest: any = null;
      if (faceCount > 0) {
        largest = faces[0];
        for (const f of faces) {
          const w = (f as any).bounds?.width ?? 0;
          const lw = largest.bounds?.width ?? 0;
          if (w > lw) largest = f;
        }
        yaw = largest.yawAngle ?? 0;
        pitch = largest.pitchAngle ?? 0;
        faceWidth = largest.bounds?.width ?? 0;
      }
      onFrameJs(faceCount, yaw, pitch, faceWidth);

      if (faceCount === 1 && largest) {
        const pad = 0.15;
        const bw = largest.bounds.width;
        const bh = largest.bounds.height;
        const cx = largest.bounds.x + bw / 2;
        const cy = largest.bounds.y + bh / 2;
        const side = Math.max(bw, bh) * (1 + pad);
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
          // Bounds at frame edge — skip.
        }
      }
    },
    [detectFaces, onFrameJs, resize, pushCropJs]
  );

  async function doCapture(pose: Pose) {
    setCapturing(true);
    setShowFlash(true);
    try {
      // Grab the freshest face crop from the frame store BEFORE taking the
      // photo (takePhoto pauses the frame processor briefly).
      const cropInfo = getLatestCrop();
      if (!cropInfo || Date.now() - cropInfo.at > 1000) {
        throw new Error('no_recent_crop');
      }
      const vector = await embed(cropInfo.crop);
      embeddingsRef.current[pose] = vector;

      const photo = await cameraRef.current?.takePhoto({
        enableShutterSound: false,
        flash: 'off',
      });
      const uri = photo ? `file://${photo.path}` : '';
      setCaptured((c) => ({ ...c, [pose]: uri }));
      setStatusText(`${POSE_LABEL[pose]} Captured ✓`);

      await new Promise((r) => setTimeout(r, POST_CAPTURE_PAUSE_MS));

      setShowFlash(false);
      capturingRef.current = false;
      stableSinceRef.current = null;

      const nextIndex = poseIndex + 1;
      if (nextIndex >= POSE_ORDER.length) {
        setPoseIndex(nextIndex);
        const finalPhotos = { ...captured, [pose]: uri } as Record<Pose, string>;
        const finalEmbeddings = { ...embeddingsRef.current } as Record<Pose, Float32Array>;
        setTimeout(() => onComplete(finalPhotos, finalEmbeddings), 300);
      } else {
        setPoseIndex(nextIndex);
        setStatusText(POSE_INSTRUCTION[POSE_ORDER[nextIndex]]);
      }
    } catch (e) {
      setShowFlash(false);
      capturingRef.current = false;
      stableSinceRef.current = null;
      setStatusText('Capture failed — hold steady and try again');
    } finally {
      setCapturing(false);
    }
  }

  const liveCamera = hasPermission && device && isFocused;

  return (
    <View style={styles.body}>
      {employee ? (
        <Text style={styles.enrollingText}>Enrolling: {employee.name}</Text>
      ) : null}

      <View style={styles.cameraWrap}>
        {liveCamera ? (
          <>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              photo={true}
              frameProcessor={frameProcessor}
              pixelFormat="yuv"
            />
            <View style={styles.faceGuide} pointerEvents="none" />
            {showFlash ? <View style={styles.flash} pointerEvents="none" /> : null}
          </>
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraPlaceholderText}>
              {!hasPermission
                ? 'Grant camera permission to continue.'
                : 'Initialising camera…'}
            </Text>
          </View>
        )}
      </View>

      <CircularProgress
        percent={progressPct}
        completed={completedCount}
        total={POSE_ORDER.length}
        currentPose={currentPose}
      />

      <Text style={styles.statusText}>{statusText}</Text>

      <View style={styles.dotsRow}>
        {POSE_ORDER.map((p, i) => {
          const done = !!captured[p];
          const active = i === poseIndex && !done;
          return (
            <View key={p} style={styles.dotItem}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                {done ? <Text style={styles.dotCheck}>✓</Text> : null}
              </View>
              <Text style={[styles.dotLabel, (done || active) && styles.dotLabelActive]}>
                {POSE_LABEL[p]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Review step ----------

function ReviewStep({
  employee,
  photos,
  onConfirm,
  onRetake,
}: {
  employee: Employee | null;
  photos: Record<Pose, string>;
  onConfirm: () => void;
  onRetake: () => void;
}) {
  return (
    <View style={styles.body}>
      <Text style={styles.heading}>Review enrollment</Text>
      {employee ? (
        <View style={styles.empCard}>
          <Text style={styles.empName}>{employee.name}</Text>
          <Text style={styles.empCode}>ID: {employee.employee_code}</Text>
        </View>
      ) : null}

      <View style={styles.thumbsRow}>
        {POSE_ORDER.map((p) => (
          <View key={p} style={styles.thumb}>
            {photos[p] ? (
              <Image source={{ uri: photos[p] }} style={styles.thumbImg} />
            ) : (
              <View style={[styles.thumbImg, styles.thumbPlaceholder]}>
                <Text style={styles.thumbPlaceholderText}>—</Text>
              </View>
            )}
            <Text style={styles.thumbLabel}>{POSE_LABEL[p]}</Text>
          </View>
        ))}
      </View>

      <Pressable style={[styles.primary, shadow.primaryButton]} onPress={onConfirm}>
        <Text style={styles.primaryText}>Confirm & Upload</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onRetake}>
        <Text style={styles.secondaryText}>Retake Enrollment</Text>
      </Pressable>
    </View>
  );
}

// ---------- Circular progress ----------

function CircularProgress({
  percent,
  completed,
  total,
  currentPose,
}: {
  percent: number;
  completed: number;
  total: number;
  currentPose: Pose | null;
}) {
  // Simple 3-segment ring with a center label. Each segment fills as a pose is captured.
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressRing}>
        {/* base ring */}
        <View style={[styles.progressArc, styles.progressArcBase]} />
        {/* filled portion = completed/total of a full ring, approximated as a tinted half-ring per third */}
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i < completed && styles.progressSegmentFilled,
              { transform: [{ rotate: `${i * 120}deg` }] },
            ]}
          />
        ))}
        <View style={styles.progressInner}>
          <Text style={styles.progressPct}>{percent}%</Text>
          <Text style={styles.progressCount}>{completed} / {total}</Text>
          <Text style={styles.progressLabel}>
            {currentPose ? POSE_LABEL[currentPose] : 'Done'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------- helpers ----------

function poseMatches(pose: Pose, yaw: number, pitch: number): boolean {
  if (pose === 'forward') {
    return Math.abs(yaw) < FORWARD_YAW && Math.abs(pitch) < FORWARD_PITCH;
  }
  if (pose === 'left') return yaw < -SIDE_YAW;
  if (pose === 'right') return yaw > SIDE_YAW;
  return false;
}

function findDuplicateInRoster(candidate: Float32Array, excludeId: string): string | null {
  const roster = getRosterInMemory();
  for (const e of roster) {
    if (e.employee_id === excludeId) continue;
    if (cosineSimilarity(candidate, e.vector) > DUP_THRESHOLD) return e.employee_id;
  }
  return null;
}

// ---------- styles ----------

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
  enrollingText: { color: colors.text.muted, fontSize: typography.caption.fontSize },
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

  // Camera
  cameraWrap: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: radius.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.large },
  cameraPlaceholderText: { color: colors.text.muted, textAlign: 'center' },
  faceGuide: {
    width: '70%',
    aspectRatio: 3 / 4,
    borderRadius: 200,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  // Status + dots
  statusText: {
    color: colors.text.primary.onDark,
    fontSize: typography.heading2.fontSize,
    textAlign: 'center',
    fontWeight: '600',
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  dotItem: { alignItems: 'center', gap: 6 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.text.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.status.success, borderColor: colors.status.success },
  dotActive: { borderColor: colors.brand.primary },
  dotCheck: { color: '#fff', fontWeight: '700' },
  dotLabel: { color: colors.text.muted, fontSize: typography.caption.fontSize },
  dotLabelActive: { color: colors.text.primary.onDark, fontWeight: '500' },

  // Circular progress
  progressContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  progressRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressArc: { ...StyleSheet.absoluteFillObject, borderRadius: 55 },
  progressArcBase: {
    borderWidth: 6,
    borderColor: colors.border.subtleOnDark,
  },
  progressSegment: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    borderColor: 'transparent',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  progressSegmentFilled: {
    borderTopColor: colors.brand.primary,
  },
  progressInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPct: { color: colors.brand.primary, fontWeight: '700', fontSize: 18 },
  progressCount: { color: colors.text.primary.onDark, fontSize: 12, marginTop: 2 },
  progressLabel: { color: colors.text.muted, fontSize: 10, marginTop: 1 },

  // Review
  empCard: {
    padding: spacing.medium,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
  },
  empName: { color: colors.text.primary.onDark, fontWeight: '600', fontSize: typography.body.fontSize },
  empCode: { color: colors.text.muted, fontSize: typography.caption.fontSize, marginTop: 2 },
  thumbsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  thumb: { alignItems: 'center', gap: 6, flex: 1 },
  thumbImg: { width: 90, height: 110, borderRadius: 10, backgroundColor: colors.surface.dark.card },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { color: colors.text.muted, fontSize: 22 },
  thumbLabel: { color: colors.text.muted, fontSize: typography.caption.fontSize },
});

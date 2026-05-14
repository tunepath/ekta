import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import { colors, typography, spacing, radius } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { embed } from '@/services/ml/embedder';
import { findBestMatch } from '@/services/recognition/matcher';
import { getEmployee, loadAllEmbeddings } from '@/services/db/roster';
import { postPunch } from '@/services/api/attendance';
import { useKioskStore } from '@/stores/kiosk';
import { useSettingsStore } from '@/stores/settings';
import { getLatestCrop } from '@/services/recognition/frameStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PunchProcessing'>;
type RouteProp = NativeStackScreenProps<RootStackParamList, 'PunchProcessing'>['route'];

export function PunchProcessingScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp>();
  const { type } = route.params;
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void runPunch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPunch() {
    const threshold = useSettingsStore.getState().matchThreshold;
    const office = useKioskStore.getState().office;
    const deviceId = useKioskStore.getState().deviceId ?? 'unknown-device';

    try {
      const roster = await loadAllEmbeddings();
      if (roster.length === 0) {
        nav.replace('PunchFailure', {
          reason: 'No employees enrolled yet. Use Admin → Enroll Face to add one.',
        });
        return;
      }

      const cropInfo = getLatestCrop();
      if (!cropInfo || Date.now() - cropInfo.at > 3000) {
        nav.replace('PunchFailure', {
          reason: 'No face detected. Please face the camera and try again.',
        });
        return;
      }
      const candidate = await embed(cropInfo.crop);

      const match = findBestMatch(candidate, roster, threshold);
      if (!match) {
        nav.replace('PunchFailure', {
          reason: 'Face not recognized. Please try again or contact HR.',
        });
        return;
      }

      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.granted) {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      } catch {
        /* lat/lng remain null */
      }

      const res = await postPunch({
        employee_id: match.employee_id,
        type,
        ts: new Date().toISOString(),
        lat,
        lng,
        kiosk_id: deviceId,
        confidence: match.similarity,
        liveness_score: 1,
        client_uuid: uuidv4(),
      });

      const emp = await getEmployee(match.employee_id);
      if (useSettingsStore.getState().hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      nav.replace('PunchSuccess', {
        type: res.type,
        employeeName: emp?.name ?? 'Unknown',
        employeeCode: emp?.employee_code ?? '—',
        employeePhotoUrl: emp?.photo_url ?? null,
        ts: res.server_ts,
        location: office?.name ?? '—',
        shift_name: res.shift_name,
        on_time: res.on_time,
        today_minutes: res.today_minutes,
      });
    } catch (e: any) {
      nav.replace('PunchFailure', {
        reason:
          e?.response?.status === 401
            ? 'Session expired. Please sign in again.'
            : 'Attendance failed. Please check your network and try again.',
      });
    }
  }

  const typeLabel = type === 'in' ? 'Punch In' : 'Punch Out';

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{typeLabel.toUpperCase()}</Text>
        </View>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={styles.title}>Marking Attendance…</Text>
        <Text style={styles.subtitle}>
          Please wait while we verify your face and record {typeLabel.toLowerCase()}.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.dark.bg },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.pagePadding,
    gap: spacing.large,
  },
  badge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.pill,
    marginBottom: spacing.medium,
  },
  badgeText: {
    color: colors.text.onPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: typography.button.fontSize,
  },
  title: {
    fontSize: typography.display.fontSize,
    fontWeight: '600',
    color: colors.text.primary.onDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.text.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.large,
  },
});

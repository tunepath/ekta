import { useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { findBestMatch } from '@/services/recognition/matcher';
import type { RosterEmbedding } from '@/services/db/roster';
import { getEmployee } from '@/services/db/roster';
import { postPunch } from '@/services/api/attendance';
import { useKioskStore } from '@/stores/kiosk';
import { useSettingsStore } from '@/stores/settings';
import { v4 as uuidv4 } from 'uuid';
import type { RootStackParamList } from '@/navigation/types';

const DEDUPE_WINDOW_MS = 30_000;

type Nav = NativeStackNavigationProp<RootStackParamList>;

type LastPunch = {
  employeeId: string;
  type: 'in' | 'out';
  at: number;
};

export function usePunch() {
  const nav = useNavigation<Nav>();
  const kiosk = useKioskStore.getState();
  const threshold = useSettingsStore((s) => s.matchThreshold);
  const lastPunch = useRef<LastPunch | null>(null);

  return useCallback(
    async (params: {
      type: 'in' | 'out';
      embedding: Float32Array;
      roster: RosterEmbedding[];
    }) => {
      // 1. Match
      const match = findBestMatch(params.embedding, params.roster, threshold);
      if (!match) {
        // Phase 6: surface non-blocking toast on the idle screen
        return { ok: false as const, reason: 'no_match' };
      }

      // 2. Dedupe (A5)
      const now = Date.now();
      if (
        lastPunch.current &&
        lastPunch.current.employeeId === match.employee_id &&
        lastPunch.current.type === params.type &&
        now - lastPunch.current.at < DEDUPE_WINDOW_MS
      ) {
        return { ok: false as const, reason: 'duplicate_silent' };
      }

      // 3. Location
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.granted) {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      } catch {
        /* lat/lng remain null */
      }

      // 4. POST
      const office = useKioskStore.getState().office;
      const deviceId = useKioskStore.getState().deviceId ?? 'unknown-device';
      const ts = new Date().toISOString();
      const clientUuid = uuidv4();

      try {
        const res = await postPunch({
          employee_id: match.employee_id,
          type: params.type,
          ts,
          lat,
          lng,
          kiosk_id: deviceId,
          confidence: match.similarity,
          liveness_score: 1, // passive liveness — set 1 on pass for v1
          client_uuid: clientUuid,
        });

        lastPunch.current = { employeeId: match.employee_id, type: params.type, at: now };

        // 5. Feedback (sound + haptic)
        const { soundEnabled, hapticsEnabled } = useSettingsStore.getState();
        if (hapticsEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        if (soundEnabled) {
          playBeep().catch(() => {});
        }

        // 6. Success screen
        const emp = await getEmployee(match.employee_id);
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
        return { ok: true as const, match };
      } catch (e: any) {
        nav.replace('PunchFailure', {
          reason:
            e?.response?.status === 401
              ? 'Session expired. Please sign in again.'
              : 'Network error — please try again.',
        });
        return { ok: false as const, reason: 'post_failed' };
      }
    },
    [nav, threshold]
  );
}

async function playBeep() {
  // Phase 6: drop a real beep .mp3 into app/assets/sounds/beep.mp3 then wire
  // `Audio.Sound.createAsync(require(...))` here. Until the asset is in place,
  // this is a no-op so the bundle resolves cleanly.
}

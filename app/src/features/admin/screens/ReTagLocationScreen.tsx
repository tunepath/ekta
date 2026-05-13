import { Text } from 'react-native';

import { PlaceholderScreen } from '@/shared/ui/PlaceholderScreen';
import { colors, typography } from '@/config/theme';

export function ReTagLocationScreen() {
  return (
    <PlaceholderScreen
      title="Re-tag kiosk location"
      subtitle="Re-runs the GPS detection + office picker from Phase 1."
    >
      <Text style={{ color: colors.text.muted, fontSize: typography.body.fontSize }}>
        This screen reuses the KioskIdentity flow. Phase 8 wiring: navigate to
        KioskIdentity from here, then return to Settings on confirmation.
      </Text>
    </PlaceholderScreen>
  );
}

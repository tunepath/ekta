import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, typography, spacing, radius } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PunchFailure'>;
type RouteProp = NativeStackScreenProps<RootStackParamList, 'PunchFailure'>['route'];

export function PunchFailureScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp>();
  const { reason } = route.params;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Couldn't save your punch</Text>
        </View>
        <Text style={styles.reason}>{reason}</Text>
        <Pressable style={styles.primary} onPress={() => nav.replace('Idle')}>
          <Text style={styles.primaryText}>Try again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.dark.bg },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.pagePadding, gap: spacing.large },
  banner: {
    backgroundColor: colors.status.error,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  bannerText: { color: '#fff', fontWeight: '700', fontSize: typography.body.fontSize },
  reason: { color: colors.text.muted, fontSize: typography.body.fontSize, textAlign: 'center' },
  primary: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: radius.pill,
  },
  primaryText: { color: colors.text.onPrimary, fontWeight: '600', fontSize: typography.button.fontSize },
});

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, radius } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AdminMenu'>;
type Item = { label: string; route: keyof RootStackParamList; description: string };

const ITEMS: Item[] = [
  {
    label: 'Enroll Face',
    route: 'ConsentBiometric',
    description: 'Register or re-capture an employee’s face',
  },
  {
    label: 'Settings',
    route: 'Settings',
    description: 'PIN, password, camera, location, advanced',
  },
  {
    label: 'Logout',
    route: 'Logout',
    description: 'Sign out of this kiosk',
  },
];

export function AdminMenuScreen() {
  const nav = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Admin</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.list}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.route}
            style={styles.row}
            onPress={() => nav.navigate(item.route as never)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowDescription}>{item.description}</Text>
            </View>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.dark.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pagePadding,
    paddingVertical: spacing.small,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: colors.text.primary.onDark, fontSize: 28 },
  headerTitle: {
    fontSize: typography.heading2.fontSize,
    color: colors.text.primary.onDark,
    fontWeight: '600',
  },
  list: {
    padding: spacing.pagePadding,
    gap: spacing.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.large,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
  },
  rowLabel: {
    fontSize: typography.heading2.fontSize,
    fontWeight: typography.heading2.fontWeight as '600',
    color: colors.text.primary.onDark,
  },
  rowDescription: {
    fontSize: typography.caption.fontSize,
    color: colors.text.muted,
    marginTop: 4,
  },
  rowChevron: {
    fontSize: 28,
    color: colors.brand.primary,
  },
});

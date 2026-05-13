import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';

import { colors, typography, spacing, radius } from '@/config/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const CHANGE_PASSWORD_URL = 'https://ektahr.example.com/account/password';

type Item =
  | { label: string; description: string; route: keyof RootStackParamList }
  | { label: string; description: string; onPress: () => void };

export function SettingsScreen() {
  const nav = useNavigation<Nav>();

  const items: Item[] = [
    { label: 'Change PIN', description: 'Update your admin PIN', route: 'ChangePin' },
    {
      label: 'Change Password',
      description: 'Opens ektaHR portal in browser',
      onPress: () => WebBrowser.openBrowserAsync(CHANGE_PASSWORD_URL),
    },
    { label: 'Camera', description: 'Frame rate preset', route: 'CameraSettings' },
    { label: 'Sound & Haptics', description: 'Audio + vibration on success', route: 'SoundSettings' },
    { label: 'Re-tag kiosk location', description: 'Re-run GPS office matching', route: 'ReTagLocation' },
    { label: 'Advanced', description: 'Match threshold (caution)', route: 'AdvancedSettings' },
    { label: 'About / Diagnostics', description: 'Version, kiosk ID, device info', route: 'AboutScreen' },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ padding: spacing.pagePadding, gap: spacing.small }}>
        {items.map((item, i) => (
          <Pressable
            key={i}
            style={styles.row}
            onPress={() => {
              if ('route' in item) nav.navigate(item.route as never);
              else item.onPress();
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowDescription}>{item.description}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
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
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.medium,
    backgroundColor: colors.surface.dark.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtleOnDark,
  },
  rowLabel: { color: colors.text.primary.onDark, fontSize: typography.body.fontSize, fontWeight: '600' },
  rowDescription: { color: colors.text.muted, fontSize: typography.caption.fontSize, marginTop: 2 },
  chevron: { color: colors.brand.primary, fontSize: 24 },
});

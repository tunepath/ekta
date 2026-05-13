import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { colors, typography, spacing, radius } from '@/config/theme';

type Props = {
  title: string;
  subtitle?: string;
  /** Show a back button in the header. Defaults to true. */
  showBack?: boolean;
  children?: React.ReactNode;
};

/**
 * Generic scaffolding screen for placeholder routes. Phase 1+ implementations
 * will replace each placeholder with the real screen.
 */
export function PlaceholderScreen({
  title,
  subtitle,
  showBack = true,
  children,
}: Props) {
  const nav = useNavigation();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {showBack && nav.canGoBack() ? (
          <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
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
    borderRadius: radius.input,
  },
  backArrow: {
    color: colors.brand.primary,
    fontSize: 28,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: typography.heading2.fontSize,
    lineHeight: typography.heading2.lineHeight,
    fontWeight: typography.heading2.fontWeight as '600',
    color: colors.brand.primary,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.large,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text.muted,
    marginBottom: spacing.large,
  },
});

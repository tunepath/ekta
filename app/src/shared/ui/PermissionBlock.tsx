import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';

import { colors, typography, spacing, radius } from '@/config/theme';

type Props = {
  title: string;
  message: string;
};

export function PermissionBlock({ title, message }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.button} onPress={() => Linking.openSettings()}>
        <Text style={styles.buttonText}>Open Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.pagePadding,
    gap: spacing.large,
  },
  title: { fontSize: typography.display.fontSize, fontWeight: '600', color: colors.text.primary.onDark, textAlign: 'center' },
  message: { fontSize: typography.body.fontSize, color: colors.text.muted, textAlign: 'center', lineHeight: 24 },
  button: { paddingHorizontal: 32, paddingVertical: 16, backgroundColor: colors.brand.primary, borderRadius: radius.pill },
  buttonText: { fontSize: typography.button.fontSize, fontWeight: '600', color: colors.text.onPrimary },
});

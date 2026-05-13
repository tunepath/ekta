import { Component, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { colors, typography, spacing, radius } from '@/config/theme';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <Text style={styles.title}>Something went wrong.</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
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
  message: { fontSize: typography.body.fontSize, color: colors.text.muted, textAlign: 'center' },
  button: { paddingHorizontal: 32, paddingVertical: 16, backgroundColor: colors.brand.primary, borderRadius: radius.pill },
  buttonText: { fontSize: typography.button.fontSize, fontWeight: '600', color: colors.text.onPrimary },
});

/**
 * Design tokens extracted from the ektaHR Figma file.
 * See PLAN.md section 11 for the source.
 */

export const colors = {
  brand: {
    primary: '#ffb422',
    primaryShadow: 'rgba(255,180,34,0.2)',
  },
  surface: {
    light: {
      bg: '#ffffff',
    },
    dark: {
      bg: '#121212',
      card: '#1c1c1c',
      input: '#333333',
    },
  },
  text: {
    primary: {
      onLight: '#1c1c1c',
      onDark: '#ffffff',
    },
    muted: '#a1a1a1',
    placeholder: 'rgba(161,161,161,0.6)',
    onPrimary: '#000000',
  },
  border: {
    subtleOnDark: 'rgba(255,255,255,0.05)',
  },
  status: {
    success: '#22c55e',
    warning: '#ffb422',
    error: '#ef4444',
  },
} as const;

export const typography = {
  fontFamily: 'Inter',
  display: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  heading2: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  button: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
} as const;

export const spacing = {
  pagePadding: 16,
  cardPadding: 33,
  formGap: 24,
  small: 8,
  medium: 16,
  large: 24,
} as const;

export const radius = {
  card: 16,
  input: 4,
  pill: 28,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 8,
  },
  primaryButton: {
    shadowColor: '#ffb422',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
} as const;

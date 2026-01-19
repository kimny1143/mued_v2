/**
 * MUEDear Design Tokens
 * Color palette based on Hoo mascot design
 */

// MUEDear カラーパレット
export const colors = {
  // Primary - Gold/Amber (Hoo's eyes, accent)
  primary: '#F5A623',
  primaryLight: '#F7B94D',
  primaryDark: '#D88F1B',

  // Secondary - Sage Green
  secondary: '#7D9B76',
  secondaryLight: '#9AB393',
  secondaryDark: '#5F7D58',

  // Backgrounds
  backgroundLight: '#F5E6D3',
  backgroundDark: '#2D2D2D',
  backgroundCard: '#3D3D3D',

  // Text
  textDark: '#3D3D3D',
  textLight: '#FAFAFA',
  textMuted: '#9CA3AF',

  // Status
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // UI Elements
  border: '#4A4A4A',
  borderLight: '#E5E5E5',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// Dark theme specific
export const darkTheme = {
  background: colors.backgroundDark,
  backgroundSecondary: colors.backgroundCard,
  text: colors.textLight,
  textSecondary: colors.textMuted,
  border: colors.border,
  card: colors.backgroundCard,
};

// Light theme specific
export const lightTheme = {
  background: colors.backgroundLight,
  backgroundSecondary: '#FFFFFF',
  text: colors.textDark,
  textSecondary: '#6B7280',
  border: colors.borderLight,
  card: '#FFFFFF',
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// Font sizes
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 64,
};

// Font weights
export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Border radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Shadow
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
  },
};

// Game specific colors
export const gameColors = {
  mufreq: '#F5A623',   // Gold - EQ
  mucomp: '#7D9B76',   // Sage - Dynamics
  murush: '#EF4444',   // Red - Speed
  muverb: '#3B82F6',   // Blue - Space
  muwidth: '#8B5CF6',  // Purple - Stereo
};

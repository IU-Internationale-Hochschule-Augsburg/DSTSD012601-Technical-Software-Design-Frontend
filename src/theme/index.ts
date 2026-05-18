import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// ─── Custom Brand Colors ────────────────────────────────────────────────────

const brandColors = {
  primary: '#6750A4',
  primaryContainer: '#EADDFF',
  secondary: '#625B71',
  secondaryContainer: '#E8DEF8',
  tertiary: '#7D5260',
  tertiaryContainer: '#FFD8E4',
  error: '#B3261E',
  success: '#2E7D32',
  warning: '#ED6C02',
};

// ─── Font Config ────────────────────────────────────────────────────────────

const fontConfig = {
  fontFamily: 'System',
};

const fonts = configureFonts({ config: fontConfig });

// ─── Light Theme ────────────────────────────────────────────────────────────

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColors.primary,
    primaryContainer: brandColors.primaryContainer,
    secondary: brandColors.secondary,
    secondaryContainer: brandColors.secondaryContainer,
    tertiary: brandColors.tertiary,
    tertiaryContainer: brandColors.tertiaryContainer,
    error: brandColors.error,
    surface: '#FFFBFE',
    surfaceVariant: '#E7E0EC',
    background: '#FFFBFE',
    onBackground: '#1C1B1F',
    onSurface: '#1C1B1F',
  },
};

// ─── Dark Theme ─────────────────────────────────────────────────────────────

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  fonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#D0BCFF',
    primaryContainer: '#4F378B',
    secondary: '#CCC2DC',
    secondaryContainer: '#4A4458',
    tertiary: '#EFB8C8',
    tertiaryContainer: '#633B48',
    error: '#F2B8B5',
    surface: '#1C1B1F',
    surfaceVariant: '#49454F',
    background: '#1C1B1F',
    onBackground: '#E6E1E5',
    onSurface: '#E6E1E5',
  },
};

export { brandColors };

export interface ColorTheme {
  background: string;
  surface: string;
  surfaceLight: string;
  border: string;
  borderLight: string;
  card: string;
  cardSecondary: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  logoBackdrop: string;
  logoBorder: string;
}

export const lightColors: ColorTheme = {
  background: '#F8FAFC',       // Crisp clean light background
  surface: '#FFFFFF',          // Pure white card background
  surfaceLight: '#F1F5F9',     // Slate 100 hover / secondary
  border: '#E2E8F0',           // Subtle light border
  borderLight: '#CBD5E1',      // Active border
  card: '#FFFFFF',
  cardSecondary: '#F8FAFC',
  
  // Brand accents
  primary: '#059669',          // Deep vivid emerald
  primaryDark: '#047857',      // Dark emerald
  primaryLight: '#10B981',     // Bright emerald
  accent: '#4F46E5',           // Indigo accent
  
  // Text colors
  textPrimary: '#0F172A',      // High-contrast slate 900
  textSecondary: '#475569',    // Slate 600
  textMuted: '#64748B',        // Slate 500
  
  // Status colors
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',

  // Logo container backdrop
  logoBackdrop: '#FFFFFF',
  logoBorder: '#E2E8F0',
};

export const darkColors: ColorTheme = {
  background: '#0B1120',       // Deep slate dark background
  surface: '#111827',          // Card background
  surfaceLight: '#1F2937',     // Card hover / secondary background
  border: '#1E293B',           // Subtle border
  borderLight: '#334155',      // Active border
  card: '#111827',
  cardSecondary: '#0F172A',
  
  // Brand accents
  primary: '#10B981',          // Emerald green
  primaryDark: '#059669',      // Dark emerald
  primaryLight: '#34D399',     // Light emerald for highlights
  accent: '#6366F1',           // Indigo accent
  
  // Text colors
  textPrimary: '#F8FAFC',      // Bright white text
  textSecondary: '#94A3B8',    // Muted slate text
  textMuted: '#64748B',        // Darker slate text
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Logo container backdrop (light badge so black logos are 100% visible)
  logoBackdrop: '#FFFFFF',
  logoBorder: '#334155',
};

// Default tema terang (light) sesuai instruksi pengguna
export const colors: ColorTheme = lightColors;
export const defaultColors: ColorTheme = lightColors;

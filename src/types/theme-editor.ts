export interface ThemeVariable {
  key: string;
  shortKey: string;
  label: string;
  group: ThemeVariableGroup;
  default: { dark: string; light: string };
}

export type ThemeVariableGroup = 'brand' | 'backgrounds' | 'text' | 'borders';

export interface CustomTheme {
  name: string;
  base: 'dark' | 'light';
  variables: Record<string, string>;
}

export interface ThemePreferences {
  active_theme: string;
  custom_themes: Record<string, CustomTheme>;
}

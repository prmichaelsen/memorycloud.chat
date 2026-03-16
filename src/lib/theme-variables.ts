import type { ThemeVariable, ThemeVariableGroup } from '@/types/theme-editor';

export const THEME_VARIABLES: ThemeVariable[] = [
  // Brand
  { key: '--color-brand-primary', shortKey: 'brand-primary', label: 'Primary', group: 'brand', default: { dark: '#7C3AED', light: '#7C3AED' } },
  { key: '--color-brand-secondary', shortKey: 'brand-secondary', label: 'Secondary', group: 'brand', default: { dark: '#2563EB', light: '#2563EB' } },
  { key: '--color-brand-accent', shortKey: 'brand-accent', label: 'Accent', group: 'brand', default: { dark: '#06B6D4', light: '#06B6D4' } },
  { key: '--color-brand-success', shortKey: 'brand-success', label: 'Success', group: 'brand', default: { dark: '#22C55E', light: '#22C55E' } },
  { key: '--color-brand-warning', shortKey: 'brand-warning', label: 'Warning', group: 'brand', default: { dark: '#F59E0B', light: '#F59E0B' } },
  { key: '--color-brand-danger', shortKey: 'brand-danger', label: 'Danger', group: 'brand', default: { dark: '#EF4444', light: '#EF4444' } },
  { key: '--color-brand-info', shortKey: 'brand-info', label: 'Info', group: 'brand', default: { dark: '#3B82F6', light: '#3B82F6' } },

  // Backgrounds
  { key: '--color-bg-page', shortKey: 'bg-page', label: 'Page', group: 'backgrounds', default: { dark: '#0f172a', light: '#ffffff' } },
  { key: '--color-bg-card', shortKey: 'bg-card', label: 'Card', group: 'backgrounds', default: { dark: '#1e293b', light: '#ffffff' } },
  { key: '--color-bg-sidebar', shortKey: 'bg-sidebar', label: 'Sidebar', group: 'backgrounds', default: { dark: '#0f172a', light: '#f8fafc' } },
  { key: '--color-bg-elevated', shortKey: 'bg-elevated', label: 'Elevated', group: 'backgrounds', default: { dark: '#334155', light: '#f1f5f9' } },
  { key: '--color-bg-hover', shortKey: 'bg-hover', label: 'Hover', group: 'backgrounds', default: { dark: '#334155', light: '#f1f5f9' } },
  { key: '--color-bg-active', shortKey: 'bg-active', label: 'Active', group: 'backgrounds', default: { dark: '#475569', light: '#e2e8f0' } },
  { key: '--color-bg-input', shortKey: 'bg-input', label: 'Input', group: 'backgrounds', default: { dark: '#1e293b', light: '#ffffff' } },

  // Text
  { key: '--color-text-primary', shortKey: 'text-primary', label: 'Primary', group: 'text', default: { dark: '#f8fafc', light: '#0f172a' } },
  { key: '--color-text-secondary', shortKey: 'text-secondary', label: 'Secondary', group: 'text', default: { dark: '#94a3b8', light: '#475569' } },
  { key: '--color-text-muted', shortKey: 'text-muted', label: 'Muted', group: 'text', default: { dark: '#64748b', light: '#94a3b8' } },
  { key: '--color-text-inverse', shortKey: 'text-inverse', label: 'Inverse', group: 'text', default: { dark: '#0f172a', light: '#f8fafc' } },

  // Borders
  { key: '--color-border-default', shortKey: 'border-default', label: 'Default', group: 'borders', default: { dark: '#334155', light: '#e2e8f0' } },
  { key: '--color-border-subtle', shortKey: 'border-subtle', label: 'Subtle', group: 'borders', default: { dark: '#1e293b', light: '#f1f5f9' } },
  { key: '--color-border-strong', shortKey: 'border-strong', label: 'Strong', group: 'borders', default: { dark: '#475569', light: '#cbd5e1' } },
];

export const THEME_VARIABLE_GROUPS: Record<
  ThemeVariableGroup,
  { label: string; description: string }
> = {
  brand: {
    label: 'Brand Colors',
    description: 'Primary brand colors used for buttons, links, and accents',
  },
  backgrounds: {
    label: 'Backgrounds',
    description: 'Surface and container background colors',
  },
  text: {
    label: 'Text',
    description: 'Text and content foreground colors',
  },
  borders: {
    label: 'Borders',
    description: 'Border and divider colors',
  },
};

export function cssVarToShortKey(cssVar: string): string {
  return cssVar.replace(/^--color-/, '');
}

export function shortKeyToCssVar(shortKey: string): string {
  return `--color-${shortKey}`;
}

export function getVariablesByGroup(group: ThemeVariableGroup): ThemeVariable[] {
  return THEME_VARIABLES.filter((v) => v.group === group);
}

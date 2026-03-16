import { stringify, parse } from 'yaml'
import { THEME_VARIABLES } from '@/lib/theme-variables'
import { PRESET_THEMES } from '@/lib/theme-presets'

interface ThemeYaml {
  name: string
  base: 'dark' | 'light'
  variables: Record<string, string>
}

const VALID_SHORT_KEYS = new Set(THEME_VARIABLES.map((v) => v.shortKey))
const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export function exportThemeYaml(
  name: string,
  base: 'dark' | 'light',
  variables: Record<string, string>,
): string {
  const baseDefaults = PRESET_THEMES[base] ?? PRESET_THEMES['dark']
  const sparse: Record<string, string> = {}
  for (const [key, value] of Object.entries(variables)) {
    if (value.toLowerCase() !== (baseDefaults[key] ?? '').toLowerCase()) {
      sparse[key] = value
    }
  }
  const doc: ThemeYaml = { name, base, variables: sparse }
  return stringify(doc)
}

export function parseThemeYaml(
  yamlStr: string,
): { theme: ThemeYaml } | { error: string } {
  let parsed: unknown
  try {
    parsed = parse(yamlStr)
  } catch {
    return { error: 'Invalid YAML syntax.' }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { error: 'YAML must be an object with name, base, and variables.' }
  }

  const obj = parsed as Record<string, unknown>

  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    return { error: 'Missing or empty "name" field.' }
  }

  if (obj.base !== 'dark' && obj.base !== 'light') {
    return { error: '"base" must be "dark" or "light".' }
  }

  if (!obj.variables || typeof obj.variables !== 'object' || Array.isArray(obj.variables)) {
    return { error: '"variables" must be an object.' }
  }

  const variables = obj.variables as Record<string, unknown>
  const validated: Record<string, string> = {}

  for (const [key, value] of Object.entries(variables)) {
    if (!VALID_SHORT_KEYS.has(key)) {
      return { error: `Unknown variable key: "${key}"` }
    }
    if (typeof value !== 'string' || !HEX_REGEX.test(value)) {
      return { error: `Invalid hex value for "${key}": "${String(value)}"` }
    }
    validated[key] = value
  }

  return {
    theme: {
      name: obj.name as string,
      base: obj.base as 'dark' | 'light',
      variables: validated,
    },
  }
}

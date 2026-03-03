/**
 * Grimoire Theme Configuration — "qrafthive"
 *
 * A minimal, professional, warm-pastel startup theme.
 * Source: https://tweakcn.com/themes/cmjgilzlg000404ju2wgs7uj9
 *
 * All design tokens live here so future changes propagate everywhere.
 * CSS variables in globals.css and tailwind.config.ts reference these values.
 */

// ─── Palette ────────────────────────────────────────────────────────
export const palette = {
  // Core warm orange
  primary: { light: "#d87943", dark: "#e78a53" },
  // Muted teal
  secondary: { light: "#527575", dark: "#5f8787" },
  // Backgrounds
  background: { light: "#ffffff", dark: "#121113" },
  foreground: { light: "#111827", dark: "#c1c1c1" },
  // Surfaces
  card: { light: "#f9f9f9", dark: "#1a1a1a" },
  popover: { light: "#ffffff", dark: "#1a1a1a" },
  muted: { light: "#f3f4f6", dark: "#222222" },
  accent: { light: "#eeeeee", dark: "#333333" },
  // States
  destructive: { light: "#ef4444", dark: "#ef4444" },
  // Borders
  border: { light: "#e5e7eb", dark: "#222222" },
  input: { light: "#e5e7eb", dark: "#222222" },
  ring: { light: "#d87943", dark: "#e78a53" },
} as const

// ─── Typography ─────────────────────────────────────────────────────
export const fonts = {
  sans: "Outfit",
  serif: "Merriweather",
  mono: "JetBrains Mono",
  // Fallback stacks
  sansFallback: "ui-sans-serif, system-ui, sans-serif",
  serifFallback: "ui-serif, Georgia, serif",
  monoFallback: "ui-monospace, monospace",
} as const

// ─── Design Tokens ──────────────────────────────────────────────────
export const tokens = {
  radius: "0.75rem",
  shadowColor: "#000000",
  shadowOpacity: 0.05,
  shadowBlur: "4px",
  letterSpacing: "0rem",
  spacingUnit: "0.25rem",
} as const

// ─── Chart Colors ───────────────────────────────────────────────────
export const chartColors = {
  light: {
    1: "#d87943", // primary orange
    2: "#527575", // teal
    3: "#8b5e3c", // warm brown
    4: "#6b8e8e", // light teal
    5: "#c4a882", // sand
  },
  dark: {
    1: "#e78a53", // primary orange
    2: "#5f8787", // teal
    3: "#a67c5b", // warm brown
    4: "#7da3a3", // light teal
    5: "#d4b892", // sand
  },
} as const

// ─── Sidebar ────────────────────────────────────────────────────────
export const sidebar = {
  light: {
    bg: "#fafafa",
    foreground: "#111827",
    border: "#e5e7eb",
    accent: "#d87943",
    accentForeground: "#ffffff",
    muted: "#6b7280",
  },
  dark: {
    bg: "#161516",
    foreground: "#c1c1c1",
    border: "#222222",
    accent: "#e78a53",
    accentForeground: "#ffffff",
    muted: "#737373",
  },
} as const

// ─── Gradient (warm orange → muted) ────────────────────────────────
export const gradient = {
  start: { light: "#d87943", dark: "#e78a53" },
  mid: { light: "#b8644a", dark: "#c97a5a" },
  end: { light: "#527575", dark: "#5f8787" },
} as const

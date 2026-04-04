import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Primary: driven by CSS variables (set by AdminThemeProvider) ──
        // Default fallback: red theme
        "primary":             "var(--primary, #7C0000)",
        "on-primary":          "var(--on-primary, #ffffff)",
        "primary-container":   "var(--primary-container, #ffdada)",
        "on-primary-container":"var(--on-primary-container, #410001)",
        "primary-fixed":       "var(--primary-fixed, #ffcccc)",
        "primary-fixed-dim":   "var(--primary-fixed-dim, #ffaaaa)",
        "on-primary-fixed":    "var(--on-primary-fixed, #410001)",
        "on-primary-fixed-variant": "var(--on-primary-fixed-variant, #5e0000)",
        "inverse-primary":     "var(--inverse-primary, #ffb3b3)",
        "surface-tint":         "var(--surface-tint, #930000)",

        // ── Secondary: CSS variable (light/dark aware) ──
        "secondary":                      "var(--secondary, #006c4e)",
        "on-secondary":                   "var(--on-secondary, #ffffff)",
        "secondary-container":             "var(--secondary-container, #83f5c6)",
        "on-secondary-container":         "var(--on-secondary-container, #007151)",
        "secondary-fixed":                "var(--secondary-fixed, #86f8c9)",
        "secondary-fixed-dim":            "var(--secondary-fixed-dim, #68dbae)",
        "on-secondary-fixed":             "var(--on-secondary-fixed, #002115)",
        "on-secondary-fixed-variant":     "var(--on-secondary-fixed-variant, #00513a)",

        // ── Tertiary: amber ──
        "tertiary":              "var(--tertiary, #774700)",
        "on-tertiary":           "var(--on-tertiary, #ffffff)",
        "tertiary-container":   "var(--tertiary-container, #ffe7d1)",
        "on-tertiary-container": "var(--on-tertiary-container, #ffe7d1)",
        "tertiary-fixed":        "var(--tertiary-fixed, #ffdcbb)",
        "tertiary-fixed-dim":    "var(--tertiary-fixed-dim, #ffb869)",
        "on-tertiary-fixed":     "var(--on-tertiary-fixed, #2b1700)",
        "on-tertiary-fixed-variant": "var(--on-tertiary-fixed-variant, #673d00)",

        // ── Surfaces: CSS variables (switch automatically with .dark class) ──
        "background":                   "var(--surface)",
        "surface":                     "var(--surface)",
        "surface-bright":              "var(--surface-container-lowest)",
        "surface-dim":                "var(--surface-container-low)",
        "surface-container":           "var(--surface-container)",
        "surface-container-low":      "var(--surface-container-low)",
        "surface-container-lowest":    "var(--surface-container-lowest)",
        "surface-container-high":     "var(--surface-container-high)",
        "surface-container-highest":  "var(--surface-container-highest)",
        "surface-variant":             "var(--surface-container-high)",
        "on-surface":                  "var(--on-surface)",
        "on-surface-variant":          "var(--on-surface-variant)",
        "inverse-surface":              "var(--inverse-surface)",
        "inverse-on-surface":           "var(--inverse-on-surface)",
        "inverse-surface-container":   "var(--inverse-surface-container)",
        "inverse-on-surface-container": "var(--inverse-on-surface-container)",

        // ── Outline & Error ──
        "outline":              "var(--outline, #73777f)",
        "outline-variant":      "var(--outline-variant, #c3c6cf)",
        "error":                "var(--error, #ba1a1a)",
        "error-container":     "var(--error-container, #ffdad6)",
        "on-error":             "var(--on-error, #ffffff)",
        "on-error-container":  "var(--on-error-container, #93000a)",
        "on-background":       "var(--on-surface, #1a1c1e)",
      },
      fontFamily: {
        headline: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
        chinese: ["Noto Sans SC", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;

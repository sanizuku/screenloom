/**
 * Token names as typed constants, so JS code (and later the Theme Builder)
 * can read or override CSS variables without typos.
 */
export const colorTokens = [
  "bg",
  "surface",
  "surface-muted",
  "text",
  "text-muted",
  "border",
  "border-strong",
  "primary",
  "primary-hover",
  "primary-subtle",
  "on-primary",
  "danger",
  "success",
  "focus",
] as const;

export type ColorToken = (typeof colorTokens)[number];

/** CSS variable name for a color token, e.g. cssVar("primary") -> "--sl-color-primary" */
export const cssVar = (token: ColorToken): `--sl-color-${ColorToken}` => `--sl-color-${token}`;

export type ThemeOverrides = Partial<Record<ColorToken, string>>;

/**
 * Turn overrides into a style object you can put on any element.
 * Everything inside that element picks up the new colors.
 *
 *   <div style={themeStyle({ primary: "#0b6668" })}>...</div>
 */
export function themeStyle(overrides: ThemeOverrides): Record<string, string> {
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (value) style[cssVar(key as ColorToken)] = value;
  }
  return style;
}

/**
 * Pure color math for ColorPicker (and later the Theme Builder).
 * No DOM, no React: every function is easy to unit test.
 *
 * Ranges used everywhere:
 *   r, g, b: 0-255   a: 0-1
 *   h: 0-360         s, v, l: 0-100
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSVA {
  h: number;
  s: number;
  v: number;
  a: number;
}

export interface HSLA {
  h: number;
  s: number;
  l: number;
  a: number;
}

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

export const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };
export const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 1 };

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** "#abc", "#abcd", "#aabbcc", "#aabbccdd" (with or without #). */
export function parseHex(input: string): RGBA | null {
  const m = HEX_RE.exec(input.trim());
  if (!m) return null;
  let hex = m[1]!;
  if (hex.length <= 4) hex = hex.replace(/./g, (c) => c + c);
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? round(n(6) / 255, 3) : 1 };
}

const num = (part: string | undefined, max: number): number | null => {
  if (part === undefined) return null;
  const t = part.trim();
  if (!t) return null;
  const isPct = t.endsWith("%");
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return isPct ? (n / 100) * max : n;
};

/** Split "rgb(1, 2, 3 / 50%)" or "rgb(1 2 3)" into its parts. */
function fnArgs(input: string, names: string[]): string[] | null {
  const m = /^([a-z]+)\((.*)\)$/i.exec(input.trim());
  if (!m || !names.includes(m[1]!.toLowerCase())) return null;
  const body = m[2]!.replace("/", ",");
  return body.split(/[\s,]+/).filter(Boolean);
}

/** Parse any hex, rgb()/rgba() or hsl()/hsla() string. Returns null when the text is not a color. */
export function parseColor(input: string | null | undefined): RGBA | null {
  if (!input) return null;
  const hex = parseHex(input);
  if (hex) return hex;

  const rgb = fnArgs(input, ["rgb", "rgba"]);
  if (rgb && (rgb.length === 3 || rgb.length === 4)) {
    const [r, g, b] = [num(rgb[0], 255), num(rgb[1], 255), num(rgb[2], 255)];
    const a = rgb[3] === undefined ? 1 : num(rgb[3], 1);
    if (r === null || g === null || b === null || a === null) return null;
    return { r: clamp(Math.round(r), 0, 255), g: clamp(Math.round(g), 0, 255), b: clamp(Math.round(b), 0, 255), a: clamp(a, 0, 1) };
  }

  const hsl = fnArgs(input, ["hsl", "hsla"]);
  if (hsl && (hsl.length === 3 || hsl.length === 4)) {
    const h = parseFloat(hsl[0]!);
    const s = num(hsl[1]?.endsWith("%") ? hsl[1] : `${hsl[1]}%`, 100);
    const l = num(hsl[2]?.endsWith("%") ? hsl[2] : `${hsl[2]}%`, 100);
    const a = hsl[3] === undefined ? 1 : num(hsl[3], 1);
    if (!Number.isFinite(h) || s === null || l === null || a === null) return null;
    return hslToRgb({ h, s: clamp(s, 0, 100), l: clamp(l, 0, 100), a: clamp(a, 0, 1) });
  }
  return null;
}

const hex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");

/** "#rrggbb", or "#rrggbbaa" when `withAlpha` is true. */
export function toHex(c: RGBA, withAlpha = false): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${withAlpha ? hex2(c.a * 255) : ""}`;
}

export function rgbToHsv({ r, g, b, a }: RGBA): HSVA {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100, a };
}

export function hsvToRgb({ h, s, v, a }: HSVA): RGBA {
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const hh = (((h % 360) + 360) % 360) / 60;
  const c = vn * sn;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = vn - c;
  const [r1, g1, b1] =
    hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255), a };
}

export function rgbToHsl({ r, g, b, a }: RGBA): HSLA {
  const { h } = rgbToHsv({ r, g, b, a });
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100, a };
}

export function hslToRgb({ h, s, l, a }: HSLA): RGBA {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  // HSL -> HSV, then reuse hsvToRgb.
  const v = ln + sn * Math.min(ln, 1 - ln);
  const sv = v === 0 ? 0 : 2 * (1 - ln / v);
  return hsvToRgb({ h, s: sv * 100, v: v * 100, a });
}

export const hexToHsv = (hex: string): HSVA | null => {
  const rgb = parseColor(hex);
  return rgb ? rgbToHsv(rgb) : null;
};

export const hsvToHex = (c: HSVA, withAlpha = false) => toHex(hsvToRgb(c), withAlpha);

/** Normalise any color string to "#rrggbb" / "#rrggbbaa". Returns null for invalid input. */
export function normalizeHex(input: string | null | undefined, withAlpha = false): string | null {
  const rgb = parseColor(input);
  return rgb ? toHex(withAlpha ? rgb : { ...rgb, a: 1 }, withAlpha) : null;
}

const alphaPart = (a: number) => (a < 1 ? ` / ${round(a * 100)}%` : "");

/** CSS Color 4 syntax: "rgb(36 86 199)" or "rgb(36 86 199 / 50%)". */
export const formatRgb = ({ r, g, b, a }: RGBA) => `rgb(${r} ${g} ${b}${alphaPart(a)})`;

export function formatHsl(c: RGBA): string {
  const { h, s, l, a } = rgbToHsl(c);
  return `hsl(${round(h)} ${round(s)}% ${round(l)}%${alphaPart(a)})`;
}

/** Blend a translucent color over an opaque background (simple alpha compositing). */
export function compositeOver(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

/** WCAG 2.x relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance({ r, g, b }: RGBA): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colors, 1 to 21. Translucent colors are composited first. */
export function contrastRatio(a: RGBA, b: RGBA): number {
  const bg = compositeOver(b, WHITE);
  const fg = compositeOver(a, bg);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return round((hi + 0.05) / (lo + 0.05), 2);
}

/** WCAG level for normal-size text. */
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

/** White or black, whichever reads better on top of `bg`. */
export function readableTextColor(bg: RGBA): RGBA {
  return contrastRatio(WHITE, bg) >= contrastRatio(BLACK, bg) ? WHITE : BLACK;
}

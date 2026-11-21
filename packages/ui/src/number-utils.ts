/**
 * Locale-aware number helpers for NumberInput. Pure functions, no DOM.
 */

export type NumberFormatStyle = "number" | "currency" | "percent";

export interface NumberFormatConfig {
  locale?: string;
  format?: NumberFormatStyle;
  currency?: string;
  precision?: number;
  formatOptions?: Intl.NumberFormatOptions;
}

/** Group and decimal characters for a locale, e.g. en-IN -> { group: ",", decimal: "." }. */
export function getSeparators(locale?: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
  return {
    group: parts.find((p) => p.type === "group")?.value ?? ",",
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
  };
}

/** Number of digits after the decimal point. */
export function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

export function roundTo(n: number, digits: number): number {
  return Number(n.toFixed(Math.min(100, Math.max(0, digits))));
}

/**
 * Parse what a user typed or pasted. Returns null for empty text and NaN for text that is not a number.
 *
 * Handles group separators ("1,23,456.50", "1.234,5"), currency symbols, "%", spaces,
 * "-" / unicode minus and accounting negatives "(100)". When both "," and "." appear, the last
 * one is the decimal point, so pasting from another locale still works.
 */
export function parseLocaleNumber(text: string, locale?: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const negative = /^\(.*\)$/.test(t) || /[-−]/.test(t);
  const s = t.replace(/[^\d.,]/g, "");
  if (!/\d/.test(s)) return Number.NaN;

  const { group, decimal } = getSeparators(locale);
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let dec: string | null = null;
  if (lastDot >= 0 && lastComma >= 0) {
    dec = lastDot > lastComma ? "." : ",";
  } else if (lastDot >= 0 || lastComma >= 0) {
    const ch = lastDot >= 0 ? "." : ",";
    const count = s.split(ch).length - 1;
    const digitsAfter = s.length - s.lastIndexOf(ch) - 1;
    const looksLikeGroup = count > 1 || (ch === group && ch !== decimal && digitsAfter === 3);
    dec = looksLikeGroup ? null : ch;
  }

  let normalized = s;
  if (dec) {
    const [intPart, ...fracParts] = s.split(dec);
    if (fracParts.length !== 1) return Number.NaN;
    normalized = `${intPart!.replace(/[.,]/g, "")}.${fracParts[0]}`;
  } else {
    normalized = s.replace(/[.,]/g, "");
  }
  if (normalized === "." || normalized === "") return Number.NaN;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return Number.NaN;
  return negative ? -n : n;
}

/** Build an Intl formatter for the display (blurred) state. Percent formats 15 as "15%". */
export function createNumberFormatter({ locale, format = "number", currency = "INR", precision, formatOptions }: NumberFormatConfig) {
  const opts: Intl.NumberFormatOptions = {};
  if (format === "currency") {
    opts.style = "currency";
    opts.currency = currency;
    if (precision !== undefined) {
      opts.minimumFractionDigits = precision;
      opts.maximumFractionDigits = precision;
    }
  } else if (format === "percent") {
    opts.style = "percent";
    opts.minimumFractionDigits = precision ?? 0;
    opts.maximumFractionDigits = precision ?? 2;
  } else {
    opts.minimumFractionDigits = precision ?? 0;
    opts.maximumFractionDigits = precision ?? 20;
  }
  const nf = new Intl.NumberFormat(locale, { ...opts, ...formatOptions });
  return (n: number) => nf.format(format === "percent" ? n / 100 : n);
}

/** Plain editable text for the focused state: no grouping, locale decimal mark. */
export function toRawString(n: number, locale?: string): string {
  const { decimal } = getSeparators(locale);
  const s = Number.isInteger(n) ? String(n) : String(roundTo(n, 12));
  return decimal === "." ? s : s.replace(".", decimal);
}

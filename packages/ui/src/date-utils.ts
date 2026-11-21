/**
 * Small, dependency-free helpers for calendar dates.
 *
 * Every value is an ISO calendar date string "YYYY-MM-DD" (no time, no timezone).
 * Arithmetic is done with UTC-based Date objects, so the result never depends on the
 * user's timezone or DST. Never use `new Date("YYYY-MM-DD")`: that parses as UTC midnight
 * and shows the previous day in negative-offset timezones when read with local getters.
 */

export interface DateParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

/** 0 = Sunday ... 6 = Saturday */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type FormatToken = "D" | "M" | "Y";

export interface DateFormatInfo {
  order: [FormatToken, FormatToken, FormatToken];
  separator: string;
}

export const DEFAULT_FORMAT = "DD/MM/YYYY";

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isValidParts({ year, month, day }: DateParts): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

/** Parse a strict "YYYY-MM-DD" string. Returns null for anything else, including 2026-02-30. */
export function parseISODate(iso: string | null | undefined): DateParts | null {
  if (!iso) return null;
  const m = ISO_RE.exec(iso);
  if (!m) return null;
  const parts = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return isValidParts(parts) ? parts : null;
}

export function isValidISODate(iso: string | null | undefined): iso is string {
  return parseISODate(iso) !== null;
}

export function toISODate({ year, month, day }: DateParts): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** A Date at UTC midnight for the given calendar date. Use with UTC getters or Intl `timeZone: "UTC"`. */
export function toUTCDate(iso: string): Date {
  const p = parseISODate(iso);
  if (!p) throw new RangeError(`Invalid ISO date: ${iso}`);
  const d = new Date(0);
  // setUTCFullYear keeps years < 100 as-is (Date.UTC would map 26 to 1926).
  d.setUTCFullYear(p.year, p.month - 1, p.day);
  return d;
}

function fromUTCDate(d: Date): string {
  return toISODate({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
}

/** The calendar date a local Date object shows on the user's wall clock. */
export function fromLocalDate(d: Date): string {
  return toISODate({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
}

/** Today in the user's local timezone. */
export function todayISO(): string {
  return fromLocalDate(new Date());
}

export function addDays(iso: string, amount: number): string {
  const d = toUTCDate(iso);
  d.setUTCDate(d.getUTCDate() + amount);
  return fromUTCDate(d);
}

/** Add months, clamping to the last day: 2026-01-31 + 1 month = 2026-02-28. */
export function addMonths(iso: string, amount: number): string {
  const p = parseISODate(iso);
  if (!p) throw new RangeError(`Invalid ISO date: ${iso}`);
  const total = p.year * 12 + (p.month - 1) + amount;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return toISODate({ year, month, day: Math.min(p.day, daysInMonth(year, month)) });
}

export function addYears(iso: string, amount: number): string {
  return addMonths(iso, amount * 12);
}

/** 0 = Sunday ... 6 = Saturday */
export function dayOfWeek(iso: string): WeekDay {
  return toUTCDate(iso).getUTCDay() as WeekDay;
}

export function startOfWeek(iso: string, weekStartsOn: WeekDay = 1): string {
  return addDays(iso, -((dayOfWeek(iso) - weekStartsOn + 7) % 7));
}

export function endOfWeek(iso: string, weekStartsOn: WeekDay = 1): string {
  return addDays(startOfWeek(iso, weekStartsOn), 6);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 8)}01`;
}

export function endOfMonth(iso: string): string {
  const p = parseISODate(iso);
  if (!p) throw new RangeError(`Invalid ISO date: ${iso}`);
  return toISODate({ ...p, day: daysInMonth(p.year, p.month) });
}

/** ISO strings are fixed-width, so plain string comparison is date comparison. */
export function isBefore(a: string, b: string): boolean {
  return a < b;
}

export function isOutsideRange(iso: string, min?: string | null, max?: string | null): "min" | "max" | null {
  if (min && iso < min) return "min";
  if (max && iso > max) return "max";
  return null;
}

export function clampDate(iso: string, min?: string | null, max?: string | null): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

/**
 * 6 weeks x 7 days for the month that contains `iso`, starting on `weekStartsOn`.
 * Always 6 rows so the popover never changes height between months.
 */
export function getMonthGrid(iso: string, weekStartsOn: WeekDay = 1): string[][] {
  let cursor = startOfWeek(startOfMonth(iso), weekStartsOn);
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** Read a format like "DD/MM/YYYY". Unknown formats fall back to DEFAULT_FORMAT. */
export function parseFormat(format: string = DEFAULT_FORMAT): DateFormatInfo {
  const m = /^(DD|MM|YYYY)([/.-])(DD|MM|YYYY)\2(DD|MM|YYYY)$/.exec(format);
  if (m) {
    const order = [m[1], m[3], m[4]].map((t) => t?.charAt(0)) as DateFormatInfo["order"];
    if (new Set(order).size === 3) return { order, separator: m[2] ?? "/" };
  }
  return { order: ["D", "M", "Y"], separator: "/" };
}

export function formatDate(iso: string, format: string = DEFAULT_FORMAT): string {
  const p = parseISODate(iso);
  if (!p) return "";
  const { order, separator } = parseFormat(format);
  return order.map((t) => (t === "D" ? pad(p.day) : t === "M" ? pad(p.month) : pad(p.year, 4))).join(separator);
}

/**
 * The numeric date format a locale uses, as one of our format strings.
 * en-US gives "MM/DD/YYYY", en-GB and hi-IN give "DD/MM/YYYY", de-DE gives "DD.MM.YYYY".
 */
export function getLocaleFormat(locale?: string): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }).formatToParts(toUTCDate("2026-11-23"));
    const tokens: Record<string, string> = { day: "DD", month: "MM", year: "YYYY" };
    const order = parts.filter((p) => p.type in tokens).map((p) => tokens[p.type]);
    const literal = parts.find((p) => p.type === "literal")?.value.trim() ?? "/";
    const separator = ["/", "-", "."].includes(literal) ? literal : "/";
    return order.length === 3 && new Set(order).size === 3 ? order.join(separator) : DEFAULT_FORMAT;
  } catch {
    return DEFAULT_FORMAT;
  }
}

/** Two-digit years use a sliding window: up to 50 years ahead of today, otherwise the previous century. */
function expandYear(text: string, currentYear: number): number | null {
  if (text.length === 4) return Number(text);
  if (text.length !== 2) return null;
  let year = 2000 + Number(text);
  if (year > currentYear + 50) year -= 100;
  return year;
}

function build(year: number | null, month: number, day: number): string | null {
  if (year === null) return null;
  const parts = { year, month, day };
  return isValidParts(parts) ? toISODate(parts) : null;
}

export interface ParseDateOptions {
  /** "Today" for relative shortcuts. Defaults to the local date. */
  today?: string;
}

/**
 * Parse what a user typed. Understands the format plus smart shortcuts:
 *
 *   "t"            today
 *   "+7" / "-1"    days from today
 *   "15"           the 15th of the current month
 *   "1503"         15 March this year (day/month order follows the format)
 *   "150326"       15 March 2026 (two-digit year)
 *   "15032026"     15 March 2026
 *   "5/3"          5 March this year
 *   "5/3/26"       5 March 2026, any of / - . or space as separator
 *   "2026-03-15"   ISO is always accepted
 *
 * Returns an ISO date or null when the text is not a real date.
 */
export function parseDateInput(text: string, format: string = DEFAULT_FORMAT, options: ParseDateOptions = {}): string | null {
  const input = text.trim().toLowerCase();
  if (!input) return null;
  const today = options.today ?? todayISO();
  const now = parseISODate(today);
  if (!now) return null;
  const { order } = parseFormat(format);
  const dmOrder = order.filter((t) => t !== "Y");

  if (input === "t") return today;

  const relative = /^([+-])(\d{1,5})$/.exec(input);
  if (relative) return addDays(today, Number(relative[2]) * (relative[1] === "-" ? -1 : 1));

  const pick = (values: Partial<Record<FormatToken, string>>) => {
    const day = Number(values.D);
    const month = Number(values.M);
    const year = values.Y === undefined ? now.year : expandYear(values.Y, now.year);
    return build(year, month, day);
  };

  if (/[/.\-\s]/.test(input)) {
    const parts = input.split(/[/.\-\s]+/);
    if (!parts.every((p) => /^\d+$/.test(p))) return null;
    if (parts.length === 3) {
      // A 4-digit first part means the user typed year first (ISO style).
      const tokens: FormatToken[] = parts[0]?.length === 4 ? ["Y", "M", "D"] : order;
      const values: Partial<Record<FormatToken, string>> = {};
      tokens.forEach((t, i) => (values[t] = parts[i]));
      if ((values.D?.length ?? 0) > 2 || (values.M?.length ?? 0) > 2) return null;
      return pick(values);
    }
    if (parts.length === 2) {
      if (parts.some((p) => p.length > 2)) return null;
      const values: Partial<Record<FormatToken, string>> = {};
      dmOrder.forEach((t, i) => (values[t] = parts[i]));
      return pick(values);
    }
    return null;
  }

  if (!/^\d+$/.test(input)) return null;

  if (input.length <= 2) return build(now.year, now.month, Number(input));

  const yearWidth = input.length === 8 ? 4 : input.length === 6 ? 2 : input.length === 4 ? 0 : -1;
  if (yearWidth < 0) return null;
  const tokens = yearWidth === 0 ? dmOrder : order;
  const values: Partial<Record<FormatToken, string>> = {};
  let offset = 0;
  for (const t of tokens) {
    const width = t === "Y" ? yearWidth : 2;
    values[t] = input.slice(offset, offset + width);
    offset += width;
  }
  return pick(values);
}

/**
 * Weekend days for a locale, from Intl.Locale week info where the browser has it.
 * Falls back to Saturday + Sunday.
 */
export function getWeekendDays(locale?: string): WeekDay[] {
  try {
    type WeekInfo = { weekend?: number[] };
    type LocaleWithWeek = { weekInfo?: WeekInfo; getWeekInfo?: () => WeekInfo };
    const IntlLocale = (Intl as unknown as { Locale?: new (tag: string) => LocaleWithWeek }).Locale;
    if (IntlLocale) {
      const tag = locale ?? new Intl.DateTimeFormat().resolvedOptions().locale;
      const loc = new IntlLocale(tag);
      const info = typeof loc.getWeekInfo === "function" ? loc.getWeekInfo() : loc.weekInfo;
      // Intl uses 1 = Monday ... 7 = Sunday.
      if (info?.weekend?.length) return info.weekend.map((d) => (d % 7) as WeekDay);
    }
  } catch {
    // ignore, use the fallback
  }
  return [6, 0];
}

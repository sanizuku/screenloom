import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { cx } from "./cx";
import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  dayOfWeek,
  endOfMonth,
  endOfWeek,
  getMonthGrid,
  getWeekendDays,
  isOutsideRange,
  startOfMonth,
  startOfWeek,
  toUTCDate,
  type WeekDay,
} from "./date-utils";

export type CalendarSlot = "header" | "nav" | "title" | "grid" | "weekday" | "day" | "footer" | "today";

export interface CalendarLabels {
  prevMonth: string;
  nextMonth: string;
  today: string;
}

/**
 * Internal month calendar used by DatePicker. Kept separate so a range picker or an
 * inline calendar can reuse it later. It is fully controlled: the parent owns the
 * selected value and the focused (roving) date; the visible month is derived from the focused date.
 */
export interface CalendarProps {
  value: string | null;
  /** The date that owns the roving tabindex. Its month is the month on screen. */
  focusedDate: string;
  onFocusedDateChange: (iso: string) => void;
  onSelect: (iso: string) => void;
  today: string;
  min?: string;
  max?: string;
  isDateDisabled?: (iso: string) => boolean;
  locale?: string;
  weekStartsOn: WeekDay;
  labels: CalendarLabels;
  classNames?: Partial<Record<CalendarSlot, string>>;
  loading?: boolean;
  titleId: string;
  /** Move DOM focus to the focused day after it changes (keyboard use). */
  focusDayRef: { current: boolean };
}

export function Calendar({
  value,
  focusedDate,
  onFocusedDateChange,
  onSelect,
  today,
  min,
  max,
  isDateDisabled,
  locale,
  weekStartsOn,
  labels,
  classNames = {},
  loading = false,
  titleId,
  focusDayRef,
}: CalendarProps) {
  const gridRef = useRef<HTMLTableElement>(null);

  const fmt = useMemo(() => {
    const make = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
    return {
      title: make({ month: "long", year: "numeric" }),
      full: make({ dateStyle: "full" }),
      weekdayShort: make({ weekday: "short" }),
      weekdayLong: make({ weekday: "long" }),
    };
  }, [locale]);

  const weekend = useMemo(() => getWeekendDays(locale), [locale]);
  const weeks = getMonthGrid(focusedDate, weekStartsOn);
  const visibleMonth = focusedDate.slice(0, 7);
  const weekdays = weeks[0] ?? [];

  const isDisabled = (iso: string) => isOutsideRange(iso, min, max) !== null || Boolean(isDateDisabled?.(iso));
  const prevDisabled = Boolean(min && addDays(startOfMonth(focusedDate), -1) < min);
  const nextDisabled = Boolean(max && addDays(endOfMonth(focusedDate), 1) > max);
  const todayDisabled = isDisabled(today);

  // Roving focus: after keyboard navigation, move DOM focus to the new day button.
  useEffect(() => {
    if (!focusDayRef.current) return;
    focusDayRef.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focusedDate}"]`)?.focus();
  }, [focusedDate, focusDayRef]);

  const moveTo = (iso: string) => {
    focusDayRef.current = true;
    onFocusedDateChange(clampDate(iso, min, max));
  };

  const onGridKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const d = focusedDate;
    const keyMap: Record<string, () => string> = {
      ArrowLeft: () => addDays(d, -1),
      ArrowRight: () => addDays(d, 1),
      ArrowUp: () => addDays(d, -7),
      ArrowDown: () => addDays(d, 7),
      Home: () => startOfWeek(d, weekStartsOn),
      End: () => endOfWeek(d, weekStartsOn),
      PageUp: () => (e.shiftKey ? addYears(d, -1) : addMonths(d, -1)),
      PageDown: () => (e.shiftKey ? addYears(d, 1) : addMonths(d, 1)),
    };
    const next = keyMap[e.key];
    if (!next || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    moveTo(next());
  };

  const navigate = (months: number) => {
    // Keep focus on the nav button; only the visible month changes.
    onFocusedDateChange(clampDate(addMonths(focusedDate, months), min, max));
  };

  return (
    <>
      <div className={cx("sl-datepicker__header", classNames.header)}>
        <button
          type="button"
          className={cx("sl-datepicker__nav", "sl-datepicker__nav--prev", classNames.nav)}
          aria-label={labels.prevMonth}
          disabled={prevDisabled}
          onClick={() => navigate(-1)}
        >
          <ChevronIcon direction="left" />
        </button>
        <h2 id={titleId} className={cx("sl-datepicker__title", classNames.title)} aria-live="polite">
          {fmt.title.format(toUTCDate(focusedDate))}
        </h2>
        <button
          type="button"
          className={cx("sl-datepicker__nav", "sl-datepicker__nav--next", classNames.nav)}
          aria-label={labels.nextMonth}
          disabled={nextDisabled}
          onClick={() => navigate(1)}
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <table
        ref={gridRef}
        role="grid"
        aria-labelledby={titleId}
        aria-busy={loading || undefined}
        className={cx("sl-datepicker__grid", classNames.grid)}
        onKeyDown={onGridKeyDown}
      >
        <thead>
          <tr>
            {weekdays.map((iso) => {
              const date = toUTCDate(iso);
              return (
                <th
                  key={iso}
                  scope="col"
                  abbr={fmt.weekdayLong.format(date)}
                  className={cx("sl-datepicker__weekday", classNames.weekday)}
                >
                  {fmt.weekdayShort.format(date)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((iso) => {
                const selected = iso === value;
                const disabled = isDisabled(iso);
                const focused = iso === focusedDate;
                const isToday = iso === today;
                return (
                  <td key={iso} role="gridcell" aria-selected={selected}>
                    <button
                      type="button"
                      tabIndex={focused ? 0 : -1}
                      className={cx("sl-datepicker__day", classNames.day)}
                      aria-label={fmt.full.format(toUTCDate(iso))}
                      aria-current={isToday ? "date" : undefined}
                      aria-disabled={disabled || undefined}
                      data-iso={iso}
                      data-today={isToday || undefined}
                      data-selected={selected || undefined}
                      data-outside={iso.slice(0, 7) !== visibleMonth || undefined}
                      data-disabled={disabled || undefined}
                      data-focused={focused || undefined}
                      data-weekend={weekend.includes(dayOfWeek(iso)) || undefined}
                      onClick={() => {
                        onFocusedDateChange(iso);
                        if (!disabled && !loading) onSelect(iso);
                      }}
                    >
                      {Number(iso.slice(8))}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className={cx("sl-datepicker__footer", classNames.footer)}>
        <button
          type="button"
          className={cx("sl-datepicker__today", classNames.today)}
          disabled={todayDisabled || loading}
          onClick={() => onSelect(today)}
        >
          {labels.today}
        </button>
      </div>
    </>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d={direction === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { Calendar, type CalendarSlot } from "./Calendar";
import { cx } from "./cx";
import {
  clampDate,
  formatDate,
  getLocaleFormat,
  isOutsideRange,
  isValidISODate,
  parseDateInput,
  todayISO,
  toUTCDate,
  type WeekDay,
} from "./date-utils";
import { useFieldProps } from "./Field";
import { positionPopover, showPopover } from "./popover";

/** Why typed text was rejected on commit. */
export type DatePickerInputErrorReason = "parse" | "min" | "max" | "disabled";

/** Slot names for `classNames`. Each one matches a `sl-datepicker__<slot>` CSS class. */
export type DatePickerSlot = "root" | "control" | "input" | "clear" | "trigger" | "popover" | "preview" | CalendarSlot;

/** All user-facing text, so apps can translate the control. */
export interface DatePickerLabels {
  /** Trigger button aria-label. */
  openCalendar: string;
  /** Clear button aria-label. */
  clear: string;
  prevMonth: string;
  nextMonth: string;
  /** Footer button text. */
  today: string;
  /** Dialog name, read together with the month title. */
  dialogLabel: string;
  /** Trigger description when a value is set. */
  selectedDate: (formatted: string) => string;
  /** Screen-reader-only format hint added to the input description. */
  formatHint: (format: string) => string;
  /** Parsed preview when the typed text is not a date. */
  invalidDate: string;
  /** Parsed preview when the typed date is before `min`. */
  minDate: (formatted: string) => string;
  /** Parsed preview when the typed date is after `max`. */
  maxDate: (formatted: string) => string;
  /** Parsed preview when `isDateDisabled` rejects the typed date. */
  unavailableDate: string;
}

export const defaultDatePickerLabels: DatePickerLabels = {
  openCalendar: "Open calendar",
  clear: "Clear date",
  prevMonth: "Previous month",
  nextMonth: "Next month",
  today: "Today",
  dialogLabel: "Choose date",
  selectedDate: (formatted) => `Selected date: ${formatted}`,
  formatHint: (format) => `Format: ${format}`,
  invalidDate: "Date not recognised",
  minDate: (formatted) => `Min ${formatted}`,
  maxDate: (formatted) => `Max ${formatted}`,
  unavailableDate: "Date not available",
};

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "min" | "max" | "type" | "name" | "placeholder" | "children" | "className" | "style"
>;

export interface DatePickerProps extends NativeInputProps {
  /** Controlled value, ISO "YYYY-MM-DD" or null. */
  value?: string | null;
  /** Initial value for uncontrolled use. */
  defaultValue?: string | null;
  /** Fires only with a valid, committed value (blur, Enter, calendar pick, clear), never per keystroke. */
  onChange?: (value: string | null) => void;
  /** Earliest allowed date (ISO). */
  min?: string;
  /** Latest allowed date (ISO). */
  max?: string;
  /** Return true for dates that cannot be picked (holidays, weekends, ...). */
  isDateDisabled?: (iso: string) => boolean;
  /** Display and typing format built from DD, MM, YYYY and one of / - . Defaults to the locale's order, else "DD/MM/YYYY". */
  format?: string;
  /** Locale for month and weekday names. Defaults to the browser locale. */
  locale?: string;
  /** First day of the week, 0 = Sunday ... 6 = Saturday. Default 1 (Monday). */
  weekStartsOn?: WeekDay;
  /** Show the clear button when there is a value. Default true. */
  clearable?: boolean;
  /** Defaults to the format, e.g. "DD/MM/YYYY". */
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  /** Marks the control invalid. Inside a Field with an error this is automatic. */
  invalid?: boolean;
  /** Shows a spinner in the trigger and blocks picking (e.g. while disabled dates load). */
  loading?: boolean;
  /** Name of the hidden input that carries the ISO value in native form submits. */
  name?: string;
  /** Controlled popover state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Override any user-facing text. */
  labels?: Partial<DatePickerLabels>;
  /** Custom ISO to display text conversion. */
  formatDate?: (iso: string) => string;
  /** Custom display text to ISO conversion. Return null when the text is not a date. */
  parseDate?: (text: string) => string | null;
  /** Typed text was rejected on commit. The value is not changed. */
  onInputError?: (text: string, reason: DatePickerInputErrorReason) => void;
  /** Show the "Sun, 15 Mar 2026" echo while typing. Default on for md/lg, off for sm. */
  showParsedPreview?: boolean;
  /** Class for the root element. */
  className?: string;
  /** Extra classes per part. */
  classNames?: Partial<Record<DatePickerSlot, string>>;
  /** Style for the root element. Use it to set `--sl-datepicker-*` variables per instance. */
  style?: CSSProperties;
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const normalize = (v: string | null | undefined): string | null => (v && isValidISODate(v) ? v : null);

/**
 * A single-date picker: type a date (with smart shortcuts) or pick it from a calendar popover.
 * The value is always an ISO "YYYY-MM-DD" string or null. The ref points to the text input.
 *
 *   <Field label="Joining date">
 *     <DatePicker name="joiningDate" min="2020-01-01" />
 *   </Field>
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(props, ref) {
  const {
    value: valueProp,
    defaultValue = null,
    onChange,
    min,
    max,
    isDateDisabled,
    format: formatProp,
    locale,
    weekStartsOn = 1,
    clearable = true,
    placeholder,
    size = "md",
    invalid,
    loading = false,
    name,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    labels: labelsProp,
    formatDate: formatDateProp,
    parseDate: parseDateProp,
    onInputError,
    showParsedPreview,
    className,
    classNames = {},
    style,
    id,
    required,
    disabled = false,
    readOnly = false,
    "aria-describedby": ariaDescribedBy,
    onBlur,
    onKeyDown,
    ...rest
  } = props;

  const labels: DatePickerLabels = { ...defaultDatePickerLabels, ...labelsProp };
  const format = useMemo(() => formatProp ?? getLocaleFormat(locale), [formatProp, locale]);
  const today = todayISO();
  const display = (iso: string | null | undefined) => (iso ? (formatDateProp ? formatDateProp(iso) : formatDate(iso, format)) : "");
  const parse = (text: string) => (parseDateProp ? parseDateProp(text) : parseDateInput(text, format, { today }));
  const validate = (iso: string): DatePickerInputErrorReason | null =>
    isOutsideRange(iso, min, max) ?? (isDateDisabled?.(iso) ? "disabled" : null);

  // Committed value: controlled when `value` is passed, otherwise internal state.
  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = useState(() => normalize(defaultValue));
  const value = isControlled ? normalize(valueProp) : internalValue;
  const setValue = (next: string | null) => {
    if (next === value) return;
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  // Draft text: what is in the input right now. Re-synced whenever the committed value or format changes.
  const [text, setText] = useState(() => display(value));
  const [inputError, setInputError] = useState<DatePickerInputErrorReason | null>(null);
  const syncKey = `${value ?? ""}|${format}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    setText(display(value));
    setInputError(null);
  }
  const committedText = display(value);
  const dirty = text !== committedText;

  // Popover open state, also controlled or uncontrolled.
  const canOpen = !disabled && !readOnly;
  const isOpenControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = (isOpenControlled ? openProp : internalOpen) && canOpen;
  const setOpen = (next: boolean) => {
    if (next === isOpen) return;
    if (!isOpenControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  // Roving focus date inside the calendar. Reset every time the popover opens.
  const initialFocus = () => clampDate(value ?? today, min, max);
  const [focusedDate, setFocusedDate] = useState(initialFocus);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setFocusedDate(initialFocus());
  }

  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusDayRef = useRef(false);
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const uid = useId();
  const popoverId = `sl-${uid}-popover`;
  const titleId = `sl-${uid}-title`;
  const dialogLabelId = `sl-${uid}-dialog-label`;
  const formatHintId = `sl-${uid}-format`;
  const selectedId = `sl-${uid}-selected`;

  const field = useFieldProps({ id, required, "aria-describedby": ariaDescribedBy, invalid });
  const isInvalid = Boolean(field["aria-invalid"]) || inputError !== null;
  const describedBy = [field["aria-describedby"], formatHintId].filter(Boolean).join(" ");

  /** Parse and commit typed text. Invalid text stays in the input and is flagged. */
  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setText("");
      setInputError(null);
      setValue(null);
      return;
    }
    const iso = parse(trimmed);
    const reason: DatePickerInputErrorReason | null = iso ? validate(iso) : "parse";
    if (!iso || reason) {
      setText(raw);
      setInputError(reason ?? "parse");
      onInputError?.(raw, reason ?? "parse");
      return;
    }
    setText(display(iso));
    setInputError(null);
    setValue(iso);
  };

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) inputRef.current?.focus();
  };

  const openFromUser = () => {
    if (!canOpen) return;
    focusDayRef.current = true;
    setOpen(true);
  };

  const selectDate = (iso: string) => {
    setText(display(iso));
    setInputError(null);
    setValue(iso);
    close(true);
  };

  const clear = () => {
    setText("");
    setInputError(null);
    setValue(null);
    inputRef.current?.focus();
  };

  // Show the popover in the top layer, position it, and close on outside pointer down.
  useIsoLayoutEffect(() => {
    if (!isOpen) return;
    const pop = popoverRef.current;
    const anchor = controlRef.current;
    if (!pop || !anchor) return;
    showPopover(pop);
    const update = () => positionPopover(anchor, pop);
    update();
    const onPointerDown = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenRef.current(false);
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.altKey && e.key === "ArrowDown") {
      e.preventDefault();
      openFromUser();
      return;
    }
    if (e.key === "Enter") {
      // Only block form submit when there is something to commit.
      if (dirty) {
        e.preventDefault();
        commit(e.currentTarget.value);
      }
      return;
    }
    if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      } else if (dirty) {
        e.preventDefault();
        e.stopPropagation();
        setText(committedText);
        setInputError(null);
      }
      return;
    }
    if ((e.key === "t" || e.key === "T") && !e.altKey && !e.ctrlKey && !e.metaKey && !readOnly && !parseDateProp) {
      const el = e.currentTarget;
      const allSelected = el.value === "" || (el.selectionStart === 0 && el.selectionEnd === el.value.length);
      if (allSelected) {
        e.preventDefault();
        commit("t");
      }
    }
  };

  const handleInputBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (dirty) commit(e.currentTarget.value);
    onBlur?.(e);
  };

  // Close when keyboard focus leaves the whole control (not on clicks into the popover).
  const handleRootBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (isOpen && next && !rootRef.current?.contains(next)) setOpen(false);
  };

  const handlePopoverKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key === "Tab") {
      // Focus trap: cycle through prev, next, the focused day and today.
      const pop = e.currentTarget;
      const focusables = Array.from(pop.querySelectorAll<HTMLElement>("button:not([disabled])")).filter((el) => el.tabIndex >= 0);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !pop.contains(active))) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };

  // Parsed preview ("Sun, 15 Mar 2026"), debounced so screen readers are not flooded.
  const showPreview = showParsedPreview ?? size !== "sm";
  const previewFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
    [locale],
  );
  const fullFmt = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }), [locale]);
  let previewText = "";
  let previewIsError = false;
  if (showPreview && dirty && text.trim()) {
    const iso = parse(text.trim());
    const reason = iso ? validate(iso) : "parse";
    previewIsError = reason !== null;
    if (!iso || reason === "parse") previewText = labels.invalidDate;
    else if (reason === "min") previewText = labels.minDate(display(min));
    else if (reason === "max") previewText = labels.maxDate(display(max));
    else if (reason === "disabled") previewText = labels.unavailableDate;
    else previewText = previewFmt.format(toUTCDate(iso));
  }
  const [preview, setPreview] = useState({ text: "", error: false });
  useEffect(() => {
    if (!previewText) {
      setPreview({ text: "", error: false });
      return;
    }
    const timer = setTimeout(() => setPreview({ text: previewText, error: previewIsError }), 200);
    return () => clearTimeout(timer);
  }, [previewText, previewIsError]);

  const empty = value === null && text === "";
  const showClear = clearable && !empty && !disabled && !readOnly;
  // React 18 types do not know the `popover` attribute yet; React passes it through as-is.
  const popoverAttr = { popover: "manual" } as Record<string, string>;

  return (
    <div
      ref={rootRef}
      className={cx("sl-datepicker", className, classNames.root)}
      style={style}
      data-state={isOpen ? "open" : "closed"}
      data-size={size}
      data-invalid={isInvalid || undefined}
      data-input-error={inputError ?? undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-loading={loading || undefined}
      data-empty={empty || undefined}
      onBlur={handleRootBlur}
    >
      <div ref={controlRef} className={cx("sl-control", "sl-datepicker__control", classNames.control)} data-size={size}>
        <input
          type="text"
          autoComplete="off"
          inputMode={parseDateProp ? undefined : "numeric"}
          {...rest}
          ref={setInputRef}
          id={field.id}
          required={field.required}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          className={cx("sl-datepicker__input", classNames.input)}
          value={text}
          placeholder={placeholder ?? format}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
        />
        {showClear && (
          <button type="button" className={cx("sl-datepicker__clear", classNames.clear)} aria-label={labels.clear} onClick={clear}>
            <ClearIcon />
          </button>
        )}
        {!readOnly && (
          <button
            type="button"
            className={cx("sl-datepicker__trigger", classNames.trigger)}
            aria-label={labels.openCalendar}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls={isOpen ? popoverId : undefined}
            aria-describedby={value ? selectedId : undefined}
            disabled={disabled}
            onClick={() => (isOpen ? close(false) : openFromUser())}
          >
            {loading ? <span className="sl-spinner" aria-hidden="true" /> : <CalendarIcon />}
          </button>
        )}
      </div>

      <span id={formatHintId} className="sl-visually-hidden">
        {labels.formatHint(format)}
      </span>
      {value && (
        <span id={selectedId} className="sl-visually-hidden">
          {labels.selectedDate(fullFmt.format(toUTCDate(value)))}
        </span>
      )}
      {name && <input type="hidden" name={name} value={value ?? ""} disabled={disabled} />}

      {showPreview && (
        <div className={cx("sl-datepicker__preview", classNames.preview)} aria-live="polite" data-error={preview.error || undefined}>
          {preview.text}
        </div>
      )}

      {isOpen && (
        <div
          ref={popoverRef}
          {...popoverAttr}
          id={popoverId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${dialogLabelId} ${titleId}`}
          className={cx("sl-datepicker__popover", classNames.popover)}
          data-state="open"
          data-size={size}
          onKeyDown={handlePopoverKeyDown}
        >
          <span id={dialogLabelId} className="sl-visually-hidden">
            {labels.dialogLabel}
          </span>
          <Calendar
            value={value}
            focusedDate={focusedDate}
            onFocusedDateChange={setFocusedDate}
            onSelect={selectDate}
            today={today}
            min={min}
            max={max}
            isDateDisabled={isDateDisabled}
            locale={locale}
            weekStartsOn={weekStartsOn}
            labels={labels}
            classNames={classNames}
            loading={loading}
            titleId={titleId}
            focusDayRef={focusDayRef}
          />
        </div>
      )}
    </div>
  );
});

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="2" y="3" width="12" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

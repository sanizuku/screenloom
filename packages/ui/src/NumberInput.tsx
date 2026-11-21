import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { cx } from "./cx";
import { useFieldProps } from "./Field";
import {
  createNumberFormatter,
  decimalsOf,
  parseLocaleNumber,
  roundTo,
  toRawString,
  type NumberFormatStyle,
} from "./number-utils";

/** Slot names for `classNames`. Each one matches a `sl-numberinput__<slot>` CSS class. */
export type NumberInputSlot = "root" | "control" | "input" | "stepper" | "increment" | "decrement";

/** User-facing text (i18n). */
export interface NumberInputLabels {
  increment: string;
  decrement: string;
}

export const defaultNumberInputLabels: NumberInputLabels = { increment: "Increase", decrement: "Decrease" };

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "step" | "size" | "name" | "className" | "style" | "children"
>;

export interface NumberInputProps extends NativeInputProps {
  /** Controlled value. null = empty. */
  value?: number | null;
  /** Initial value for uncontrolled use. Default null. */
  defaultValue?: number | null;
  /** Fires on commit (blur, Enter, stepper, arrow keys), never per keystroke. */
  onChange?: (value: number | null) => void;
  /** Typed values below are clamped on blur; stepping never goes below. */
  min?: number;
  /** Typed values above are clamped on blur; stepping never goes above. */
  max?: number;
  /** Arrow / stepper increment. Shift or PageUp/PageDown = 10x. Default 1. */
  step?: number;
  /** Fixed number of decimals. Values are rounded to it on commit. */
  precision?: number;
  /** Display style when not focused. Default "number". */
  format?: NumberFormatStyle;
  /** Locale for grouping and decimal mark, e.g. "en-IN" for 1,23,456. Defaults to the browser locale. */
  locale?: string;
  /** ISO currency code for format="currency". Default "INR". */
  currency?: string;
  /** Extra Intl.NumberFormat options, merged last. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Hide the up/down buttons. */
  hideStepper?: boolean;
  size?: "sm" | "md" | "lg";
  /** Marks the control invalid. Inside a Field with an error this is automatic. */
  invalid?: boolean;
  /** Name of the hidden input that carries the raw number in native form submits. */
  name?: string;
  labels?: Partial<NumberInputLabels>;
  /** Class for the root element. */
  className?: string;
  /** Extra classes per part. */
  classNames?: Partial<Record<NumberInputSlot, string>>;
  /** Style for the root element. Use it to set `--sl-numberinput-*` variables per instance. */
  style?: CSSProperties;
}

const HOLD_DELAY = 400;
const HOLD_INTERVAL = 60;

/**
 * Number field with locale formatting, stepper buttons and keyboard stepping.
 * Shows "₹1,23,456.50" when blurred and "123456.5" while editing. The ref points to the input.
 *
 *   <Field label="Amount">
 *     <NumberInput format="currency" locale="en-IN" currency="INR" min={0} name="amount" />
 *   </Field>
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(props, ref) {
  const {
    value: valueProp,
    defaultValue = null,
    onChange,
    min,
    max,
    step = 1,
    precision: precisionProp,
    format = "number",
    locale,
    currency = "INR",
    formatOptions,
    hideStepper = false,
    size = "md",
    invalid,
    name,
    labels: labelsProp,
    className,
    classNames = {},
    style,
    id,
    required,
    disabled = false,
    readOnly = false,
    "aria-describedby": ariaDescribedBy,
    onFocus,
    onBlur,
    onKeyDown,
    onPaste,
    placeholder,
    ...rest
  } = props;

  const labels: NumberInputLabels = { ...defaultNumberInputLabels, ...labelsProp };
  const precision = precisionProp ?? (format === "currency" ? 2 : undefined);
  const formatter = useMemo(
    () => createNumberFormatter({ locale, format, currency, precision: precisionProp, formatOptions }),
    [locale, format, currency, precisionProp, formatOptions],
  );

  const isControlled = valueProp !== undefined;
  const [internal, setInternal] = useState<number | null>(defaultValue);
  const value = isControlled ? (valueProp ?? null) : internal;

  // Draft text while focused. null = not editing, show the formatted value.
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  const field = useFieldProps({ id, required, "aria-describedby": ariaDescribedBy, invalid });
  const isInvalid = Boolean(field["aria-invalid"]);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const normalise = (n: number, extraDecimals = 0) => {
    const c = clamp(n);
    if (precision !== undefined) return roundTo(c, precision);
    return roundTo(c, Math.max(decimalsOf(step), extraDecimals, decimalsOf(c) > 12 ? 12 : decimalsOf(c)));
  };

  const commitValue = (next: number | null) => {
    if (next === value) return;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const raw = (n: number | null) => (n === null ? "" : toRawString(n, locale));
  const formatted = value === null ? "" : formatter(value);

  /** Parse the draft. Empty = null, junk = keep the old value. Returns the committed value. */
  const commitText = (text: string): number | null => {
    const parsed = parseLocaleNumber(text, locale);
    if (parsed === null) {
      commitValue(null);
      return null;
    }
    if (Number.isNaN(parsed)) return value;
    const next = normalise(parsed, decimalsOf(parsed));
    commitValue(next);
    return next;
  };

  // Latest-state ref so the press-and-hold timer always steps from the current value.
  const stepByRef = useRef<(dir: 1 | -1, multiplier?: number) => void>(() => undefined);
  stepByRef.current = (dir, multiplier = 1) => {
    if (disabled || readOnly) return;
    let base = value;
    if (draft !== null) {
      const parsed = parseLocaleNumber(draft, locale);
      if (parsed !== null && !Number.isNaN(parsed)) base = parsed;
    }
    const start = base ?? (min !== undefined && min > 0 ? min - step * dir * multiplier : 0);
    const next = normalise(start + dir * step * multiplier, decimalsOf(start));
    commitValue(next);
    if (draft !== null) setDraft(raw(next));
  };

  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({});
  const stopHold = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
    timers.current = {};
  };
  useEffect(() => stopHold, []);

  const startHold = (dir: 1 | -1) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button > 0) return;
    e.preventDefault(); // keep focus in the input
    stepByRef.current(dir);
    stopHold();
    timers.current.delay = setTimeout(() => {
      timers.current.repeat = setInterval(() => stepByRef.current(dir), HOLD_INTERVAL);
    }, HOLD_DELAY);
  };
  // Clicks without a pointer (screen reader virtual click) still step once.
  const virtualClick = (dir: 1 | -1) => (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) stepByRef.current(dir);
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setDraft(raw(value));
    onFocus?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (draft !== null) commitText(draft);
    setDraft(null);
    stopHold();
    onBlur?.(e);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const mult = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        stepByRef.current(1, mult);
        return;
      case "ArrowDown":
        e.preventDefault();
        stepByRef.current(-1, mult);
        return;
      case "PageUp":
        e.preventDefault();
        stepByRef.current(1, 10);
        return;
      case "PageDown":
        e.preventDefault();
        stepByRef.current(-1, 10);
        return;
      case "Home":
        if (min !== undefined && !readOnly) {
          e.preventDefault();
          commitValue(normalise(min));
          setDraft(raw(normalise(min)));
        }
        return;
      case "End":
        if (max !== undefined && !readOnly) {
          e.preventDefault();
          commitValue(normalise(max));
          setDraft(raw(normalise(max)));
        }
        return;
      case "Enter":
        if (draft !== null && draft !== raw(value)) {
          e.preventDefault();
          setDraft(raw(commitText(draft)));
        }
        return;
      case "Escape":
        if (draft !== null && draft !== raw(value)) {
          e.preventDefault();
          e.stopPropagation();
          setDraft(raw(value));
        }
        return;
    }
  };

  // Pasting "1,23,456.50" or "₹ 1,234" inserts the clean number instead of the raw clipboard text.
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    onPaste?.(e);
    if (e.defaultPrevented || readOnly) return;
    const text = e.clipboardData.getData("text");
    const parsed = parseLocaleNumber(text, locale);
    if (parsed === null || Number.isNaN(parsed)) return;
    e.preventDefault();
    const el = e.currentTarget;
    const current = draft ?? "";
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const insert = toRawString(parsed, locale);
    setDraft(current.slice(0, start) + insert + current.slice(end));
  };

  const atMax = value !== null && max !== undefined && value >= max;
  const atMin = value !== null && min !== undefined && value <= min;
  const locked = disabled || readOnly;

  return (
    <div
      className={cx("sl-numberinput", className, classNames.root)}
      style={style}
      data-size={size}
      data-format={format}
      data-focused={editing || undefined}
      data-invalid={isInvalid || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
    >
      <div className={cx("sl-control", "sl-numberinput__control", classNames.control)} data-size={size}>
        <input
          type="text"
          inputMode={precision === 0 ? "numeric" : "decimal"}
          autoComplete="off"
          {...rest}
          ref={ref}
          id={field.id}
          required={field.required}
          aria-invalid={isInvalid || undefined}
          aria-describedby={field["aria-describedby"]}
          role="spinbutton"
          aria-valuenow={value ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={formatted || undefined}
          className={cx("sl-numberinput__input", classNames.input)}
          value={editing ? draft : formatted}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        {!hideStepper && (
          <span className={cx("sl-numberinput__stepper", classNames.stepper)}>
            <button
              type="button"
              tabIndex={-1}
              aria-label={labels.increment}
              aria-controls={field.id}
              className={cx("sl-numberinput__increment", classNames.increment)}
              disabled={locked || atMax}
              onPointerDown={startHold(1)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              onMouseDown={(e) => e.preventDefault()}
              onClick={virtualClick(1)}
            >
              <ChevronIcon up />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label={labels.decrement}
              aria-controls={field.id}
              className={cx("sl-numberinput__decrement", classNames.decrement)}
              disabled={locked || atMin}
              onPointerDown={startHold(-1)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              onMouseDown={(e) => e.preventDefault()}
              onClick={virtualClick(-1)}
            >
              <ChevronIcon />
            </button>
          </span>
        )}
      </div>
      {name && <input type="hidden" name={name} value={value ?? ""} disabled={disabled} />}
    </div>
  );
});

function ChevronIcon({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path d={up ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

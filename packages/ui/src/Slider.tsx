import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cx } from "./cx";
import { useField } from "./Field";

export type SliderValue = number | [number, number];

/** Slot names for `classNames`. Each one matches a `sl-slider__<slot>` CSS class (markLabel = mark-label). */
export type SliderSlot = "root" | "track" | "range" | "thumb" | "tooltip" | "mark" | "markLabel";

export interface SliderMark {
  value: number;
  /** Text under the tick. Leave out for a plain tick. */
  label?: ReactNode;
}

/** Thumb names for screen readers (i18n). */
export interface SliderLabels {
  /** Single thumb name when no aria-label is given. */
  thumb: string;
  /** Range mode, first thumb. */
  minThumb: string;
  /** Range mode, second thumb. */
  maxThumb: string;
}

export const defaultSliderLabels: SliderLabels = { thumb: "Value", minThumb: "Minimum", maxThumb: "Maximum" };

type NativeDivProps = Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "children" | "className" | "style">;

export interface SliderProps extends NativeDivProps {
  /** Controlled value. Pass a [min, max] tuple for range mode. */
  value?: SliderValue;
  /** Initial value for uncontrolled use. A tuple turns on range mode. Default `min`. */
  defaultValue?: SliderValue;
  /** Fires on every value change, also while dragging. */
  onChange?: (value: SliderValue) => void;
  /** Fires once the user lets go (pointer up) or after a key press. Good place for API calls. */
  onChangeEnd?: (value: SliderValue) => void;
  /** Default 0. */
  min?: number;
  /** Default 100. */
  max?: number;
  /** Default 1. */
  step?: number;
  /** `true` = a tick on every step (up to 101), or a custom list with optional labels. */
  marks?: boolean | SliderMark[];
  /** When to show the value bubble. "auto" = while dragging or keyboard focus. Default "auto". */
  showTooltip?: "auto" | "always" | "never";
  /** Format the number for the tooltip and aria-valuetext, e.g. currency. */
  formatValue?: (value: number) => string;
  /** Hidden input name for form submit. Range mode renders two inputs with the same name. */
  name?: string;
  disabled?: boolean;
  /** Focusable, value visible, but cannot be changed. */
  readOnly?: boolean;
  /** Marks the control invalid. Inside a Field with an error this is automatic. */
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
  /** Override thumb names. */
  labels?: Partial<SliderLabels>;
  /** Class for the root element. */
  className?: string;
  /** Extra classes per part. */
  classNames?: Partial<Record<SliderSlot, string>>;
  /** Style for the root element. Use it to set `--sl-slider-*` variables per instance. */
  style?: CSSProperties;
}

const decimalsOf = (n: number) => {
  const s = String(n);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
};

const toArray = (v: SliderValue | undefined, min: number): number[] => (Array.isArray(v) ? [v[0], v[1]] : [v ?? min]);

/**
 * Pick a number (or a [min, max] range) by dragging or with the keyboard.
 * The ref points to the root element.
 *
 *   <Slider aria-label="Discount" defaultValue={10} max={50} formatValue={(v) => `${v}%`} />
 *   <Slider aria-label="Price" defaultValue={[200, 800]} max={1000} step={50} name="price" />
 */
export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(props, ref) {
  const {
    value: valueProp,
    defaultValue,
    onChange,
    onChangeEnd,
    min = 0,
    max = 100,
    step = 1,
    marks = false,
    showTooltip = "auto",
    formatValue,
    name,
    disabled = false,
    readOnly = false,
    invalid,
    size = "md",
    labels: labelsProp,
    className,
    classNames = {},
    style,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    ...rest
  } = props;

  const labels: SliderLabels = { ...defaultSliderLabels, ...labelsProp };
  const field = useField();
  const isInvalid = invalid ?? field?.invalid ?? false;
  const describedBy = ariaDescribedBy ?? field?.describedBy;

  const isControlled = valueProp !== undefined;
  const isRange = Array.isArray(isControlled ? valueProp : defaultValue);
  const [internal, setInternal] = useState<number[]>(() => toArray(defaultValue, min));
  const values = isControlled ? toArray(valueProp, min) : internal;
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const [activeThumb, setActiveThumb] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  // Ref copy so pointerup + lostpointercapture in the same tick end the drag only once.
  const draggingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<Array<HTMLDivElement | null>>([]);

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const span = max - min || 1;
  const pct = (v: number) => ((v - min) / span) * 100;
  const fmt = (v: number) => (formatValue ? formatValue(v) : String(v));
  const precision = Math.max(decimalsOf(step), decimalsOf(min));
  const snap = (raw: number) => {
    const stepped = Math.round((raw - min) / step) * step + min;
    return Number(Math.min(max, Math.max(min, stepped)).toFixed(precision));
  };
  const toPublic = (arr: number[]): SliderValue => (isRange ? [arr[0]!, arr[1]!] : arr[0]!);

  /** Move one thumb. Range thumbs cannot cross each other. Returns the new array. */
  const setThumb = (index: number, raw: number): number[] => {
    const current = valuesRef.current;
    let v = snap(raw);
    if (isRange) {
      if (index === 0) v = Math.min(v, current[1]!);
      else v = Math.max(v, current[0]!);
    }
    if (v === current[index]) return current;
    const next = current.slice();
    next[index] = v;
    valuesRef.current = next;
    if (!isControlled) setInternal(next);
    onChange?.(toPublic(next));
    return next;
  };

  const isRtl = () => {
    const el = rootRef.current;
    if (!el) return false;
    if (getComputedStyle(el).direction === "rtl") return true;
    return el.closest("[dir]")?.getAttribute("dir") === "rtl";
  };

  const valueFromPointer = (clientX: number): number | null => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    let ratio = (clientX - rect.left) / rect.width;
    if (isRtl()) ratio = 1 - ratio;
    return min + Math.min(1, Math.max(0, ratio)) * span;
  };

  const interactive = !disabled && !readOnly;

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || e.button > 0) return;
    const raw = valueFromPointer(e.clientX);
    if (raw === null) return;
    e.preventDefault();
    const current = valuesRef.current;
    let index = 0;
    if (isRange) {
      const d0 = Math.abs(raw - current[0]!);
      const d1 = Math.abs(raw - current[1]!);
      // When both thumbs sit on the same spot, pick the one that can move in the pointer's direction.
      index = d1 < d0 || (d0 === d1 && raw > current[1]!) ? 1 : 0;
    }
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Not supported (older browsers, jsdom): window still gets the moves while the button is down.
    }
    setActiveThumb(index);
    draggingRef.current = true;
    setDragging(true);
    thumbRefs.current[index]?.focus({ preventScroll: true });
    setThumb(index, raw);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || activeThumb === null) return;
    const raw = valueFromPointer(e.clientX);
    if (raw !== null) setThumb(activeThumb, raw);
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    onChangeEnd?.(toPublic(valuesRef.current));
  };

  const handleKeyDown = (index: number) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const current = valuesRef.current[index]!;
    const big = step * 10;
    const rtl = isRtl();
    let next: number | null = null;
    switch (e.key) {
      case "ArrowUp":
        next = current + step;
        break;
      case "ArrowDown":
        next = current - step;
        break;
      case "ArrowRight":
        next = current + (rtl ? -step : step);
        break;
      case "ArrowLeft":
        next = current + (rtl ? step : -step);
        break;
      case "PageUp":
        next = current + big;
        break;
      case "PageDown":
        next = current - big;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    const before = valuesRef.current;
    const after = setThumb(index, next);
    if (after !== before) onChangeEnd?.(toPublic(after));
  };

  // Ticks: every step for `true` (skipped when there would be too many), or the given list.
  const markList: SliderMark[] =
    marks === true
      ? span / step <= 100
        ? Array.from({ length: Math.floor(span / step) + 1 }, (_, i) => ({ value: snap(min + i * step) }))
        : []
      : Array.isArray(marks)
        ? marks.filter((m) => m.value >= min && m.value <= max)
        : [];
  const lo = isRange ? values[0]! : min;
  const hi = isRange ? values[1]! : values[0]!;
  const hasMarkLabels = markList.some((m) => m.label !== undefined);

  return (
    <div
      {...rest}
      ref={setRootRef}
      className={cx("sl-slider", className, classNames.root)}
      style={style}
      data-size={size}
      data-range={isRange || undefined}
      data-dragging={dragging || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-invalid={isInvalid || undefined}
      data-tooltip={showTooltip}
      data-has-mark-labels={hasMarkLabels || undefined}
    >
      <div
        ref={trackRef}
        className={cx("sl-slider__track", classNames.track)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <div
          className={cx("sl-slider__range", classNames.range)}
          style={{ insetInlineStart: `${pct(lo)}%`, insetInlineEnd: `${100 - pct(hi)}%` }}
        />
        {markList.map((m) => (
          <span
            key={m.value}
            className={cx("sl-slider__mark", classNames.mark)}
            style={{ insetInlineStart: `${pct(m.value)}%` }}
            data-active={(m.value >= lo && m.value <= hi) || undefined}
            aria-hidden="true"
          />
        ))}
        {values.map((v, i) => {
          const thumbMin = isRange && i === 1 ? values[0]! : min;
          const thumbMax = isRange && i === 0 ? values[1]! : max;
          const rangeName = i === 0 ? labels.minThumb : labels.maxThumb;
          const thumbName = isRange
            ? ariaLabel
              ? `${ariaLabel}, ${rangeName}`
              : rangeName
            : (ariaLabel ?? (ariaLabelledBy ? undefined : labels.thumb));
          return (
            <div
              key={i}
              ref={(node) => {
                thumbRefs.current[i] = node;
              }}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={thumbName}
              aria-labelledby={!isRange ? ariaLabelledBy : undefined}
              aria-describedby={describedBy}
              aria-valuemin={thumbMin}
              aria-valuemax={thumbMax}
              aria-valuenow={v}
              aria-valuetext={formatValue ? fmt(v) : undefined}
              aria-orientation="horizontal"
              aria-disabled={disabled || undefined}
              aria-readonly={readOnly || undefined}
              aria-invalid={isInvalid || undefined}
              className={cx("sl-slider__thumb", classNames.thumb)}
              style={{ insetInlineStart: `${pct(v)}%`, zIndex: activeThumb === i ? 2 : 1 }}
              data-active={activeThumb === i || undefined}
              onKeyDown={handleKeyDown(i)}
              onFocus={() => setActiveThumb(i)}
            >
              {showTooltip !== "never" && (
                <span className={cx("sl-slider__tooltip", classNames.tooltip)} aria-hidden="true">
                  {fmt(v)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {hasMarkLabels && (
        <div className="sl-slider__mark-labels" aria-hidden="true">
          {markList
            .filter((m) => m.label !== undefined)
            .map((m) => (
              <span key={m.value} className={cx("sl-slider__mark-label", classNames.markLabel)} style={{ insetInlineStart: `${pct(m.value)}%` }}>
                {m.label}
              </span>
            ))}
        </div>
      )}
      {name && values.map((v, i) => <input key={i} type="hidden" name={name} value={v} disabled={disabled} />)}
    </div>
  );
});

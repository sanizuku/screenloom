import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  BLACK,
  WHITE,
  clamp,
  contrastRatio,
  hexToHsv,
  hslToRgb,
  hsvToHex,
  hsvToRgb,
  normalizeHex,
  parseColor,
  readableTextColor,
  rgbToHsl,
  rgbToHsv,
  toHex,
  wcagLevel,
  type HSVA,
  type RGBA,
} from "./color-utils";
import { cx } from "./cx";
import { useFieldProps } from "./Field";
import { positionPopover, showPopover } from "./popover";

export type ColorFormat = "hex" | "rgb" | "hsl";

/** Slot names for `classNames`. Each one matches a `sl-colorpicker__<slot>` CSS class (camelCase becomes kebab-case). */
export type ColorPickerSlot =
  | "root"
  | "trigger"
  | "swatch"
  | "panel"
  | "area"
  | "areaThumb"
  | "preview"
  | "hue"
  | "alpha"
  | "formats"
  | "inputs"
  | "contrast"
  | "swatches"
  | "recent"
  | "eyedropper";

/** All user-facing text, so apps can translate the control. */
export interface ColorPickerLabels {
  /** Dialog name. */
  dialog: string;
  /** Trigger description, read after the field label. */
  selectedColor: (hex: string) => string;
  area: string;
  areaValueText: (saturation: number, brightness: number) => string;
  hue: string;
  hueValueText: (degrees: number) => string;
  alpha: string;
  format: string;
  hex: string;
  red: string;
  green: string;
  blue: string;
  saturation: string;
  lightness: string;
  presets: string;
  recent: string;
  eyeDropper: string;
  /** Previous color button (click to revert). */
  revert: (hex: string) => string;
  contrast: string;
  whiteText: string;
  blackText: string;
  /** Badge for the better of white / black text. */
  recommended: string;
}

export const defaultColorPickerLabels: ColorPickerLabels = {
  dialog: "Choose color",
  selectedColor: (hex) => `Selected color ${hex}`,
  area: "Saturation and brightness",
  areaValueText: (s, v) => `Saturation ${s}%, Brightness ${v}%`,
  hue: "Hue",
  hueValueText: (d) => `${d} degrees`,
  alpha: "Opacity",
  format: "Color format",
  hex: "Hex",
  red: "Red",
  green: "Green",
  blue: "Blue",
  saturation: "Saturation",
  lightness: "Lightness",
  presets: "Preset colors",
  recent: "Recent colors",
  eyeDropper: "Pick color from screen",
  revert: (hex) => `Revert to ${hex}`,
  contrast: "Text contrast",
  whiteText: "White text",
  blackText: "Black text",
  recommended: "Better",
};

/** A neutral 16 color starter palette. Pass `presets` to use your brand colors. */
export const defaultColorPresets: string[] = [
  "#17202a",
  "#5b6774",
  "#9aa6b2",
  "#ffffff",
  "#c0362c",
  "#e8590c",
  "#f2b705",
  "#1f7a4a",
  "#0ca678",
  "#1098ad",
  "#2456c7",
  "#4c6ef5",
  "#7048e8",
  "#ae3ec9",
  "#d6336c",
  "#795548",
];

export interface ColorPickerProps {
  /** Controlled value. Any hex / rgb() / hsl() string; it is normalised to hex. */
  value?: string;
  /** Initial value for uncontrolled use. Default "#000000". */
  defaultValue?: string;
  /** Fires live while dragging or typing, with "#rrggbb" (or "#rrggbbaa" when `alpha`). */
  onChange?: (hex: string) => void;
  /** Fires when an interaction finishes: pointer up, key press, input commit, swatch pick. */
  onChangeEnd?: (hex: string) => void;
  /** Show the opacity slider. The value is then always "#rrggbbaa". Default false. */
  alpha?: boolean;
  /** Controlled input format. */
  format?: ColorFormat;
  /** Initial input format. Default "hex". */
  defaultFormat?: ColorFormat;
  onFormatChange?: (format: ColorFormat) => void;
  /** Preset swatches. Pass [] to hide. */
  presets?: string[];
  /** Remember picked colors in localStorage. Default true. */
  showRecent?: boolean;
  /** localStorage key for recent colors. Share it between pickers to share the list. */
  recentKey?: string;
  /** Default 8. */
  maxRecent?: number;
  /** Show the white / black text contrast badges. Default true. */
  showContrast?: boolean;
  /** Show the eyedropper button where the browser supports it. Default true. */
  eyeDropper?: boolean;
  /** Render the panel in place, without a trigger and popover. */
  inline?: boolean;
  /** Controlled popover state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hidden input name for native form submit. */
  name?: string;
  disabled?: boolean;
  /** Value visible, cannot be changed. */
  readOnly?: boolean;
  /** Marks the control invalid. Inside a Field with an error this is automatic. */
  invalid?: boolean;
  required?: boolean;
  size?: "sm" | "md" | "lg";
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  labels?: Partial<ColorPickerLabels>;
  /** Class for the root element. */
  className?: string;
  /** Extra classes per part. */
  classNames?: Partial<Record<ColorPickerSlot, string>>;
  /** Style for the root element. Use it to set `--sl-colorpicker-*` variables per instance. */
  style?: CSSProperties;
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const FALLBACK = "#000000";

/** Hex -> HSVA, keeping the previous hue (and saturation) where the hex cannot carry it (greys, black). */
function hsvFromHex(hex: string, prev?: HSVA): HSVA {
  const hsv = hexToHsv(hex) ?? { h: 0, s: 0, v: 0, a: 1 };
  if (prev && (hsv.s === 0 || hsv.v === 0)) hsv.h = prev.h;
  if (prev && hsv.v === 0) hsv.s = prev.s;
  return hsv;
}

const SHORT_HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>;
}
type EyeDropperCtor = new () => EyeDropperLike;
const getEyeDropper = (): EyeDropperCtor | null =>
  typeof window !== "undefined" && "EyeDropper" in window ? ((window as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper ?? null) : null;

function readRecent(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((c): c is string => typeof c === "string" && normalizeHex(c, true) !== null) : [];
  } catch {
    return [];
  }
}

function writeRecent(key: string, list: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Private mode or storage full: recent colors just do not persist.
  }
}

/** Arrow / Page / Home / End handling shared by the hue and alpha sliders. */
function sliderKeyValue(e: KeyboardEvent, value: number, min: number, max: number): number | null {
  const small = e.shiftKey ? 10 : 1;
  switch (e.key) {
    case "ArrowRight":
    case "ArrowUp":
      return clamp(value + small, min, max);
    case "ArrowLeft":
    case "ArrowDown":
      return clamp(value - small, min, max);
    case "PageUp":
      return clamp(value + 10, min, max);
    case "PageDown":
      return clamp(value - 10, min, max);
    case "Home":
      return min;
    case "End":
      return max;
    default:
      return null;
  }
}

/** Pointer drag on a 1D/2D surface. Reports 0..1 positions; uses pointer capture so the drag survives leaving the element. */
function useDrag(onMove: (x: number, y: number) => void, onEnd: () => void, enabled: boolean, focusTarget: () => HTMLElement | null) {
  const active = useRef(false);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  const report = (e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.width > 0 ? clamp((e.clientX - rect.left) / rect.width, 0, 1) : 0;
    const y = rect.height > 0 ? clamp((e.clientY - rect.top) / rect.height, 0, 1) : 0;
    moveRef.current(x, y);
  };
  const end = () => {
    if (!active.current) return;
    active.current = false;
    endRef.current();
  };

  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!enabled || e.button > 0) return;
      e.preventDefault();
      active.current = true;
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // No pointer capture (jsdom, old browsers).
      }
      focusTarget()?.focus({ preventScroll: true });
      report(e);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (active.current) report(e);
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
  };
}

/**
 * Color picker with a saturation/brightness area, hue and opacity sliders, hex/rgb/hsl inputs,
 * presets, recent colors, eyedropper and WCAG contrast badges. The value is always a hex string.
 * The ref points to the trigger button (or the area thumb when `inline`).
 *
 *   <Field label="Brand color">
 *     <ColorPicker name="brand" defaultValue="#2456c7" />
 *   </Field>
 */
export const ColorPicker = forwardRef<HTMLElement, ColorPickerProps>(function ColorPicker(props, ref) {
  const {
    value: valueProp,
    defaultValue = FALLBACK,
    onChange,
    onChangeEnd,
    alpha = false,
    format: formatProp,
    defaultFormat = "hex",
    onFormatChange,
    presets = defaultColorPresets,
    showRecent = true,
    recentKey = "sl-colorpicker-recent",
    maxRecent = 8,
    showContrast = true,
    eyeDropper = true,
    inline = false,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    name,
    disabled = false,
    readOnly = false,
    invalid,
    required,
    size = "md",
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    labels: labelsProp,
    className,
    classNames = {},
    style,
  } = props;

  const labels: ColorPickerLabels = { ...defaultColorPickerLabels, ...labelsProp };
  const locked = disabled || readOnly;

  // ---- value: controlled or uncontrolled, always a normalised hex ----
  const isControlled = valueProp !== undefined;
  const [internal, setInternal] = useState(() => normalizeHex(defaultValue, alpha) ?? FALLBACK);
  const valueHex = normalizeHex(isControlled ? valueProp : internal, alpha) ?? (alpha ? `${FALLBACK}ff` : FALLBACK);

  // HSVA is the working state: it keeps hue while dragging through greys, which hex cannot store.
  const [hsva, setHsva] = useState<HSVA>(() => hsvFromHex(valueHex));
  if (hsvToHex(hsva, alpha) !== valueHex) {
    // Value changed from outside (parent, reset) or a controlled parent rejected our change.
    setHsva(hsvFromHex(valueHex, hsva));
  }
  const hsvaRef = useRef(hsva);
  hsvaRef.current = hsva;

  const rgb = hsvToRgb(hsva);
  const opaqueHex = toHex(rgb);

  const update = (next: HSVA, end = false) => {
    if (locked) return;
    const n: HSVA = { h: clamp(next.h, 0, 360), s: clamp(next.s, 0, 100), v: clamp(next.v, 0, 100), a: alpha ? clamp(next.a, 0, 1) : 1 };
    hsvaRef.current = n;
    setHsva(n);
    const hex = hsvToHex(n, alpha);
    if (hex !== valueHex) {
      if (!isControlled) setInternal(hex);
      onChange?.(hex);
    }
    if (end) onChangeEnd?.(hex);
  };
  const updateFromRgb = (c: RGBA, end = true) => update(rgbToHsv(c), end);
  const finish = () => onChangeEnd?.(hsvToHex(hsvaRef.current, alpha));

  // ---- format toggle ----
  const isFormatControlled = formatProp !== undefined;
  const [internalFormat, setInternalFormat] = useState<ColorFormat>(defaultFormat);
  const format = isFormatControlled ? formatProp : internalFormat;
  const setFormat = (f: ColorFormat) => {
    if (!isFormatControlled) setInternalFormat(f);
    onFormatChange?.(f);
  };

  // ---- recent colors (localStorage, read after mount so SSR markup matches) ----
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    if (showRecent) setRecent(readRecent(recentKey));
  }, [showRecent, recentKey]);
  const lastSaved = useRef(valueHex);
  const saveRecent = (hex: string) => {
    if (!showRecent || hex === lastSaved.current) return;
    lastSaved.current = hex;
    const next = [hex, ...readRecent(recentKey).filter((c) => c !== hex)].slice(0, maxRecent);
    setRecent(next);
    writeRecent(recentKey, next);
  };

  // ---- eyedropper (feature-detected after mount) ----
  const [canEyeDrop, setCanEyeDrop] = useState(false);
  useEffect(() => setCanEyeDrop(eyeDropper && getEyeDropper() !== null), [eyeDropper]);
  const pickFromScreen = async () => {
    const Ctor = getEyeDropper();
    if (!Ctor || locked) return;
    try {
      const result = await new Ctor().open();
      const c = parseColor(result.sRGBHex);
      if (c) updateFromRgb({ ...c, a: hsvaRef.current.a });
    } catch {
      // User pressed Escape: nothing picked.
    }
  };

  // ---- popover open state ----
  const canOpen = !inline && !disabled && !readOnly;
  const isOpenControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = !inline && (isOpenControlled ? openProp : internalOpen) && canOpen;
  const [openedWith, setOpenedWith] = useState(valueHex);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setOpenedWith(valueHex);
  }
  const setOpen = (next: boolean) => {
    if (next === isOpen) return;
    if (!next) saveRecent(valueHex);
    if (!isOpenControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  // ---- refs and ids ----
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const areaThumbRef = useRef<HTMLDivElement | null>(null);
  const hueThumbRef = useRef<HTMLDivElement>(null);
  const alphaThumbRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef(false);

  const assignRef = useCallback(
    (node: HTMLElement | null) => {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (!inline) assignRef(node);
    },
    [assignRef, inline],
  );
  const setAreaThumbRef = useCallback(
    (node: HTMLDivElement | null) => {
      areaThumbRef.current = node;
      if (inline) assignRef(node);
    },
    [assignRef, inline],
  );

  const uid = useId();
  const panelId = `sl-${uid}-panel`;
  const selectedId = `sl-${uid}-selected`;
  const field = useFieldProps({ id, required, "aria-describedby": ariaDescribedBy, invalid });
  const isInvalid = Boolean(field["aria-invalid"]);
  const displayHex = valueHex.toUpperCase();

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };
  const openFromUser = () => {
    if (!canOpen) return;
    focusOnOpen.current = true;
    setOpen(true);
  };

  useIsoLayoutEffect(() => {
    if (!isOpen) return;
    const pop = panelRef.current;
    const anchor = triggerRef.current;
    if (!pop || !anchor) return;
    showPopover(pop);
    const place = () => positionPopover(anchor, pop);
    place();
    if (focusOnOpen.current) {
      focusOnOpen.current = false;
      areaThumbRef.current?.focus({ preventScroll: true });
    }
    const onPointerDown = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenRef.current(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  const handleRootBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && rootRef.current?.contains(next)) return;
    if (isOpen && next) setOpen(false);
    if (inline) saveRecent(valueHex);
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.altKey && e.key === "ArrowDown") || (!isOpen && e.key === "ArrowDown")) {
      e.preventDefault();
      openFromUser();
    }
  };

  const handlePanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (inline) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key === "Tab") {
      const pop = e.currentTarget;
      const focusables = Array.from(
        pop.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]'),
      ).filter((el) => el.tabIndex >= 0);
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

  // ---- area (saturation x, brightness y) ----
  const areaDrag = useDrag(
    (x, y) => update({ ...hsvaRef.current, s: x * 100, v: (1 - y) * 100 }),
    finish,
    !locked,
    () => areaThumbRef.current,
  );
  const handleAreaKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (locked) return;
    const d = e.shiftKey ? 10 : 1;
    const c = hsvaRef.current;
    let next: HSVA | null = null;
    if (e.key === "ArrowRight") next = { ...c, s: c.s + d };
    else if (e.key === "ArrowLeft") next = { ...c, s: c.s - d };
    else if (e.key === "ArrowUp") next = { ...c, v: c.v + d };
    else if (e.key === "ArrowDown") next = { ...c, v: c.v - d };
    else if (e.key === "PageUp") next = { ...c, v: c.v + 10 };
    else if (e.key === "PageDown") next = { ...c, v: c.v - 10 };
    else if (e.key === "Home") next = { ...c, s: 0 };
    else if (e.key === "End") next = { ...c, s: 100 };
    if (!next) return;
    e.preventDefault();
    // Round so keyboard steps land on whole percents.
    update({ ...next, s: Math.round(next.s), v: Math.round(next.v) }, true);
  };

  // ---- hue + alpha sliders ----
  const hueDrag = useDrag((x) => update({ ...hsvaRef.current, h: x * 360 }), finish, !locked, () => hueThumbRef.current);
  const alphaDrag = useDrag((x) => update({ ...hsvaRef.current, a: Math.round(x * 100) / 100 }), finish, !locked, () => alphaThumbRef.current);

  const handleHueKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (locked) return;
    const next = sliderKeyValue(e, Math.round(hsvaRef.current.h), 0, 360);
    if (next === null) return;
    e.preventDefault();
    update({ ...hsvaRef.current, h: next }, true);
  };
  const handleAlphaKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (locked) return;
    const next = sliderKeyValue(e, Math.round(hsvaRef.current.a * 100), 0, 100);
    if (next === null) return;
    e.preventDefault();
    update({ ...hsvaRef.current, a: next / 100 }, true);
  };

  // ---- text inputs ----
  const hsl = rgbToHsl(rgb);
  const alphaPct = Math.round(hsva.a * 100);
  const commitHex = (text: string) => {
    const c = parseColor(text);
    if (!c) return false;
    // "#rrggbb" typed while alpha is on: keep the current opacity.
    updateFromRgb(SHORT_HEX.test(text.trim()) ? { ...c, a: hsvaRef.current.a } : c);
    return true;
  };
  const setChannel = (patch: Partial<RGBA>) => updateFromRgb({ ...rgb, a: hsva.a, ...patch });
  const setHslChannel = (patch: Partial<{ h: number; s: number; l: number }>) => {
    const next = { ...hsl, ...patch, a: hsva.a };
    const c = hslToRgb(next);
    // Keep hue when the HSL color is grey.
    const hsv = rgbToHsv(c);
    update({ ...hsv, h: patch.h ?? (hsv.s === 0 ? hsva.h : hsv.h) }, true);
  };

  // ---- contrast ----
  const contrastBg: RGBA = { ...rgb, a: hsva.a };
  const whiteRatio = contrastRatio(WHITE, contrastBg);
  const blackRatio = contrastRatio(BLACK, contrastBg);
  const better = readableTextColor({ ...rgb, a: 1 }) === WHITE ? "white" : "black";

  const pickSwatch = (hex: string) => {
    const c = parseColor(hex);
    if (c) updateFromRgb(alpha ? c : { ...c, a: 1 });
  };

  const rootStyle = {
    ...style,
    "--sl-colorpicker-hue-color": `hsl(${Math.round(hsva.h)} 100% 50%)`,
    "--sl-colorpicker-current": opaqueHex,
  } as CSSProperties;

  const panel = (
    <div
      ref={panelRef}
      {...(inline ? {} : ({ popover: "manual" } as Record<string, string>))}
      id={panelId}
      role={inline ? "group" : "dialog"}
      aria-modal={inline ? undefined : true}
      aria-label={inline ? (ariaLabel ?? labels.dialog) : labels.dialog}
      aria-labelledby={inline ? ariaLabelledBy : undefined}
      aria-describedby={inline ? field["aria-describedby"] : undefined}
      className={cx("sl-colorpicker__panel", !inline && "sl-glass", classNames.panel)}
      data-state="open"
      data-size={size}
      onKeyDown={handlePanelKeyDown}
    >
      <div className={cx("sl-colorpicker__area", classNames.area)} {...areaDrag}>
        <div
          ref={setAreaThumbRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={labels.area}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsva.s)}
          aria-valuetext={labels.areaValueText(Math.round(hsva.s), Math.round(hsva.v))}
          aria-disabled={disabled || undefined}
          aria-readonly={readOnly || undefined}
          className={cx("sl-colorpicker__area-thumb", classNames.areaThumb)}
          style={{ left: `${hsva.s}%`, top: `${100 - hsva.v}%`, background: opaqueHex }}
          onKeyDown={handleAreaKeyDown}
        />
      </div>

      <div className="sl-colorpicker__row">
        <div className={cx("sl-colorpicker__preview", classNames.preview)}>
          {!inline && openedWith !== valueHex && (
            <button
              type="button"
              className="sl-colorpicker__preview-old"
              style={{ "--sl-colorpicker-swatch": openedWith } as CSSProperties}
              aria-label={labels.revert(openedWith.toUpperCase())}
              title={labels.revert(openedWith.toUpperCase())}
              disabled={locked}
              onClick={() => pickSwatch(openedWith)}
            />
          )}
          <span className="sl-colorpicker__preview-new" style={{ "--sl-colorpicker-swatch": valueHex } as CSSProperties} aria-hidden="true" />
        </div>
        <div className="sl-colorpicker__sliders">
          <div className={cx("sl-colorpicker__hue", "sl-colorpicker__channel", classNames.hue)} {...hueDrag}>
            <div
              ref={hueThumbRef}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={labels.hue}
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(hsva.h)}
              aria-valuetext={labels.hueValueText(Math.round(hsva.h))}
              aria-orientation="horizontal"
              aria-disabled={disabled || undefined}
              aria-readonly={readOnly || undefined}
              className="sl-colorpicker__channel-thumb"
              style={{ left: `${(hsva.h / 360) * 100}%`, background: `hsl(${Math.round(hsva.h)} 100% 50%)` }}
              onKeyDown={handleHueKey}
            />
          </div>
          {alpha && (
            <div className={cx("sl-colorpicker__alpha", "sl-colorpicker__channel", classNames.alpha)} {...alphaDrag}>
              <div
                ref={alphaThumbRef}
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label={labels.alpha}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={alphaPct}
                aria-valuetext={`${alphaPct}%`}
                aria-orientation="horizontal"
                aria-disabled={disabled || undefined}
                aria-readonly={readOnly || undefined}
                className="sl-colorpicker__channel-thumb"
                style={{ left: `${alphaPct}%` }}
                onKeyDown={handleAlphaKey}
              />
            </div>
          )}
        </div>
        {canEyeDrop && (
          <button
            type="button"
            className={cx("sl-colorpicker__icon-button", "sl-colorpicker__eyedropper", classNames.eyedropper)}
            aria-label={labels.eyeDropper}
            title={labels.eyeDropper}
            disabled={locked}
            onClick={pickFromScreen}
          >
            <EyeDropperIcon />
          </button>
        )}
      </div>

      <div className="sl-colorpicker__fields">
        <div role="group" aria-label={labels.format} className={cx("sl-colorpicker__formats", classNames.formats)}>
          {(["hex", "rgb", "hsl"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="sl-colorpicker__format"
              aria-pressed={format === f}
              disabled={disabled}
              onClick={() => setFormat(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className={cx("sl-colorpicker__inputs", classNames.inputs)} data-format={format}>
          {format === "hex" && (
            <TextChannel label={labels.hex} short="HEX" wide value={displayHex} disabled={disabled} readOnly={readOnly} onCommit={commitHex} />
          )}
          {format === "rgb" && (
            <>
              <NumberChannel label={labels.red} short="R" value={rgb.r} max={255} disabled={disabled} readOnly={readOnly} onCommit={(r) => setChannel({ r })} />
              <NumberChannel label={labels.green} short="G" value={rgb.g} max={255} disabled={disabled} readOnly={readOnly} onCommit={(g) => setChannel({ g })} />
              <NumberChannel label={labels.blue} short="B" value={rgb.b} max={255} disabled={disabled} readOnly={readOnly} onCommit={(b) => setChannel({ b })} />
            </>
          )}
          {format === "hsl" && (
            <>
              <NumberChannel label={labels.hue} short="H" value={Math.round(hsl.s === 0 ? hsva.h : hsl.h)} max={360} disabled={disabled} readOnly={readOnly} onCommit={(h) => setHslChannel({ h })} />
              <NumberChannel label={labels.saturation} short="S" value={Math.round(hsl.s)} max={100} disabled={disabled} readOnly={readOnly} onCommit={(s) => setHslChannel({ s })} />
              <NumberChannel label={labels.lightness} short="L" value={Math.round(hsl.l)} max={100} disabled={disabled} readOnly={readOnly} onCommit={(l) => setHslChannel({ l })} />
            </>
          )}
          {alpha && (
            <NumberChannel
              label={labels.alpha}
              short="A%"
              value={alphaPct}
              max={100}
              disabled={disabled}
              readOnly={readOnly}
              onCommit={(a) => update({ ...hsvaRef.current, a: a / 100 }, true)}
            />
          )}
        </div>
      </div>

      {showContrast && (
        <div className={cx("sl-colorpicker__contrast", classNames.contrast)} role="group" aria-label={labels.contrast}>
          <ContrastChip text={labels.whiteText} fg={WHITE} bg={valueHex} ratio={whiteRatio} best={better === "white"} recommended={labels.recommended} />
          <ContrastChip text={labels.blackText} fg={BLACK} bg={valueHex} ratio={blackRatio} best={better === "black"} recommended={labels.recommended} />
        </div>
      )}

      {presets.length > 0 && (
        <SwatchGroup
          className={cx("sl-colorpicker__swatches", classNames.swatches)}
          label={labels.presets}
          colors={presets}
          selected={valueHex}
          alpha={alpha}
          disabled={locked}
          onPick={pickSwatch}
        />
      )}
      {showRecent && recent.length > 0 && (
        <SwatchGroup
          className={cx("sl-colorpicker__recent", classNames.recent)}
          label={labels.recent}
          showLabel
          colors={recent}
          selected={valueHex}
          alpha={alpha}
          disabled={locked}
          onPick={pickSwatch}
        />
      )}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={cx("sl-colorpicker", className, classNames.root)}
      style={rootStyle}
      data-state={inline ? undefined : isOpen ? "open" : "closed"}
      data-size={size}
      data-inline={inline || undefined}
      data-invalid={isInvalid || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-alpha={alpha || undefined}
      onBlur={handleRootBlur}
    >
      {!inline && (
        <button
          ref={setTriggerRef}
          type="button"
          id={field.id}
          className={cx("sl-control", "sl-colorpicker__trigger", classNames.trigger)}
          data-size={size}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={[selectedId, field["aria-describedby"]].filter(Boolean).join(" ")}
          aria-invalid={isInvalid || undefined}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          aria-readonly={readOnly || undefined}
          disabled={disabled}
          onClick={() => (isOpen ? close(false) : openFromUser())}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className={cx("sl-colorpicker__swatch", classNames.swatch)} style={{ "--sl-colorpicker-swatch": valueHex } as CSSProperties} aria-hidden="true" />
          <span className="sl-colorpicker__value">{displayHex}</span>
          <ChevronIcon />
        </button>
      )}
      {!inline && (
        <span id={selectedId} className="sl-visually-hidden">
          {labels.selectedColor(displayHex)}
        </span>
      )}
      {name && <input type="hidden" name={name} value={valueHex} disabled={disabled} />}
      {(inline || isOpen) && panel}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Small internal parts                                               */
/* ------------------------------------------------------------------ */

interface ChannelBaseProps {
  label: string;
  short: string;
  disabled: boolean;
  readOnly: boolean;
}

/** Text box that keeps a draft while focused and commits on blur / Enter. Invalid text snaps back. */
function TextChannel({ label, short, value, wide, disabled, readOnly, onCommit }: ChannelBaseProps & { value: string; wide?: boolean; onCommit: (text: string) => boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft.trim() && draft !== value) onCommit(draft.trim());
    setDraft(null);
  };
  return (
    <label className="sl-colorpicker__input-wrap" data-wide={wide || undefined}>
      <input
        className="sl-colorpicker__input"
        aria-label={label}
        value={draft ?? value}
        spellCheck={false}
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape" && draft !== null) {
            e.stopPropagation();
            setDraft(null);
          }
        }}
      />
      <span className="sl-colorpicker__input-label" aria-hidden="true">
        {short}
      </span>
    </label>
  );
}

/** 0..max integer channel. ArrowUp/Down steps (Shift = 10) and commits right away. */
function NumberChannel({ label, short, value, max, disabled, readOnly, onCommit }: ChannelBaseProps & { value: number; max: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (text: string | null) => {
    setDraft(null);
    if (text === null) return;
    const n = Number(text.replace("%", "").trim());
    if (text.trim() === "" || !Number.isFinite(n)) return;
    const c = clamp(Math.round(n), 0, max);
    if (c !== value) onCommit(c);
  };
  return (
    <label className="sl-colorpicker__input-wrap">
      <input
        className="sl-colorpicker__input"
        aria-label={label}
        inputMode="numeric"
        value={draft ?? String(value)}
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !readOnly) {
            e.preventDefault();
            const base = draft !== null && Number.isFinite(Number(draft)) ? Number(draft) : value;
            const d = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1);
            setDraft(null);
            const c = clamp(Math.round(base + d), 0, max);
            if (c !== value) onCommit(c);
          } else if (e.key === "Escape" && draft !== null) {
            e.stopPropagation();
            setDraft(null);
          }
        }}
      />
      <span className="sl-colorpicker__input-label" aria-hidden="true">
        {short}
      </span>
    </label>
  );
}

/** Swatch buttons with roving tabindex: one Tab stop, arrows move between colors. */
function SwatchGroup({
  className,
  label,
  showLabel = false,
  colors,
  selected,
  alpha,
  disabled,
  onPick,
}: {
  className: string;
  label: string;
  showLabel?: boolean;
  colors: string[];
  selected: string;
  alpha: boolean;
  disabled: boolean;
  onPick: (hex: string) => void;
}) {
  const items = colors.map((c) => normalizeHex(c, alpha)).filter((c): c is string => c !== null);
  const selectedIndex = items.indexOf(selected);
  const [focusIndex, setFocusIndex] = useState(Math.max(0, selectedIndex));
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabIndexOf = (i: number) => (i === (selectedIndex >= 0 ? selectedIndex : Math.min(focusIndex, items.length - 1)) ? 0 : -1);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % items.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next === null) return;
    e.preventDefault();
    setFocusIndex(next);
    refs.current[next]?.focus();
  };

  return (
    <div className={className}>
      {showLabel && (
        <span className="sl-colorpicker__group-label" aria-hidden="true">
          {label}
        </span>
      )}
      <div role="group" aria-label={label} className="sl-colorpicker__swatch-list">
        {items.map((hex, i) => (
          <button
            key={`${hex}-${i}`}
            ref={(n) => {
              refs.current[i] = n;
            }}
            type="button"
            className="sl-colorpicker__swatch-button"
            style={{ "--sl-colorpicker-swatch": hex } as CSSProperties}
            aria-label={hex.toUpperCase()}
            title={hex.toUpperCase()}
            aria-pressed={hex === selected}
            tabIndex={tabIndexOf(i)}
            disabled={disabled}
            onFocus={() => setFocusIndex(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onClick={() => onPick(hex)}
          />
        ))}
      </div>
    </div>
  );
}

function ContrastChip({ text, fg, bg, ratio, best, recommended }: { text: string; fg: RGBA; bg: string; ratio: number; best: boolean; recommended: string }) {
  const level = wcagLevel(ratio);
  return (
    <div className="sl-colorpicker__contrast-chip" data-level={level} data-best={best || undefined}>
      <span className="sl-colorpicker__contrast-sample" style={{ "--sl-colorpicker-swatch": bg, color: toHex(fg) } as CSSProperties} aria-hidden="true">
        Aa
      </span>
      <span className="sl-colorpicker__contrast-text">
        <span className="sl-colorpicker__contrast-name">{text}</span>
        <span className="sl-colorpicker__contrast-ratio">
          {ratio.toFixed(2)}:1 <span className="sl-colorpicker__contrast-level">{level}</span>
          {best && <span className="sl-colorpicker__contrast-best"> · {recommended}</span>}
        </span>
      </span>
    </div>
  );
}

function ChevronIcon(): ReactNode {
  return (
    <svg className="sl-colorpicker__chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeDropperIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M10.5 2.5l3 3-1.5 1.5-.75-.75L6 11.5 3.5 12.5l1-2.5 5.25-5.25-.75-.75z M3 13l-1 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

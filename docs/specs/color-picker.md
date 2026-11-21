# ColorPicker: design spec (v0.2)

> Status: draft. Package: `@screenloom/ui`. CSS block: `sl-colorpicker`. Math: `color-utils.ts` (pure, tested).

## 1. Kya hai, kab use karein
Theme builder, label/status color, chart series color. Value hamesha hex string: `#rrggbb` (ya `alpha` ho to `#rrggbbaa`).
Sirf 5-6 fixed choices hon to swatches wala RadioGroup kaafi hai.

## 2. Anatomy
```
root (sl-colorpicker)                     data-state, data-size, data-invalid, data-disabled, data-inline
├── trigger (sl-control sl-colorpicker__trigger)  swatch + hex text + chevron, aria-haspopup="dialog"
└── panel (sl-colorpicker__panel)        popover mode mein glass + sl-pop-in, inline mode mein raised card
    ├── area (sl-colorpicker__area)       saturation (x) / brightness (y)
    │   └── areaThumb (sl-colorpicker__area-thumb) role="slider"
    ├── preview (sl-colorpicker__preview) pehle vs ab (pehle par click = revert)
    ├── eyedropper (sl-colorpicker__eyedropper) sirf supported browser mein
    ├── hue (sl-colorpicker__hue) / alpha (sl-colorpicker__alpha)  role="slider"
    ├── formats (sl-colorpicker__formats) HEX / RGB / HSL toggle (aria-pressed)
    ├── inputs (sl-colorpicker__inputs)   channel inputs
    ├── contrast (sl-colorpicker__contrast) white aur black par WCAG ratio + AA/AAA badge
    ├── swatches (sl-colorpicker__swatches) presets
    └── recent (sl-colorpicker__recent)   localStorage se
```
Slots = upar ke naam: `root, trigger, swatch, panel, area, areaThumb, preview, hue, alpha, formats, inputs, contrast, swatches, recent, eyedropper`.

## 3. Props
| Prop | Type | Default |
|---|---|---|
| `value` / `defaultValue` | string (koi bhi CSS hex/rgb/hsl, normalise hokar hex) | `#000000` |
| `onChange` | `(hex) => void` | live (drag ke dauraan) |
| `onChangeEnd` | `(hex) => void` | pointer up, input commit, swatch pick |
| `alpha` | boolean | `false` (true = value hamesha `#rrggbbaa`) |
| `format` / `onFormatChange` | `"hex" \| "rgb" \| "hsl"` | `hex` (input mode) |
| `presets` | string[] | 16 neutral palette |
| `showRecent`, `recentKey`, `maxRecent` | | `true`, `"sl-colorpicker-recent"`, 8 |
| `showContrast` | boolean | `true` |
| `eyeDropper` | boolean | `true` (unsupported browser mein button hide) |
| `inline` | boolean | `false` |
| `open` / `defaultOpen` / `onOpenChange` | | |
| `name`, `disabled`, `readOnly`, `invalid`, `size`, `labels`, `classNames` | | |

Ref: trigger `<button>` (inline mode mein area thumb).

## 4. Keyboard + ARIA
- Trigger: Enter/Space/Alt+ArrowDown kholta hai; panel `role="dialog"`, Escape band karke focus trigger par, Tab trap.
- Area: APG mein 2D slider pattern nahi hai, isliye ek thumb `role="slider"` + `aria-valuetext="Saturation 60%, Brightness 80%"`;
  Left/Right = saturation, Up/Down = brightness, Shift = 10, Home/End = saturation 0/100, PageUp/Down = brightness 10.
- Hue / alpha: APG slider (arrows, Shift, PageUp/Down, Home/End).
- Swatches: roving tabindex (ek Tab stop, arrows se ghoomo), `aria-pressed` selected par, naam = hex.

## 5. Visual + motion
Floating panel `.sl-glass` + `sl-pop-in`; area/hue/alpha `--sl-radius-md`; alpha + swatch transparent par checkerboard
(`--sl-colorpicker-checker`). Area gradient mein white/black literal hai (color math ka hissa, theme color nahi).
Contrast badge: ratio + "AA"/"AAA"/"Fail" text (sirf color nahi).

## 6. Stories
Default, Controlled, Alpha, Inline, Formats, CustomPresets, InField, States, BrandTheming (contrast use), Customised, Dark.

## 7. Design sawaal (default chuna)
- Recent kab save? **Popover close par (value badli ho to)**; inline mein focus panel se bahar jaaye tab. Har drag nahi.
- Alpha on par hamesha 8-digit? **Haan**, backend ke liye fixed length.
- `null` (no color) support? **Abhi nahi**, v0.3 mein `clearable`.

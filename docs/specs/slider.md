# Slider: design spec (v0.2)

> Status: draft. Package: `@screenloom/ui`. CSS block: `sl-slider`.

## 1. Kya hai, kab use karein
Range ke andar number chunna jab exact number se zyada "approx position" matter kare (discount %, price range filter,
volume). Exact number type karna ho to `NumberInput`. Range filter (min-max) ke liye range mode (do thumbs).

## 2. Anatomy
```
root (sl-slider)                data-size, data-disabled, data-readonly, data-dragging, data-range
├── track (sl-slider__track)    pointer yahan pakda jaata hai (setPointerCapture)
│   ├── range (sl-slider__range)  bhara hua hissa
│   ├── mark  (sl-slider__mark)   optional ticks, data-active
│   └── thumb (sl-slider__thumb)  role="slider", 1 ya 2
│       └── tooltip (sl-slider__tooltip) glass, drag / keyboard focus par, sl-fade-in
├── markLabel (sl-slider__mark-label) optional
└── hidden input(s)              name ke saath (range mein do, same name)
```
Slots: `root`, `track`, `range`, `thumb`, `tooltip`, `mark`, `markLabel`.

## 3. Props
| Prop | Type | Default |
|---|---|---|
| `value` / `defaultValue` | `number \| [number, number]` | `min` (array ho to range mode) |
| `onChange` | `(value) => void` | har value change par (drag ke dauraan bhi) |
| `onChangeEnd` | `(value) => void` | pointer up / key press ke baad (API call yahan) |
| `min`, `max`, `step` | number | 0, 100, 1 |
| `marks` | `boolean \| { value; label? }[]` | `false` (true = har step par tick, max 101) |
| `showTooltip` | `"auto" \| "always" \| "never"` | `auto` |
| `formatValue` | `(v) => string` | tooltip + `aria-valuetext` |
| `name`, `disabled`, `readOnly`, `size` | | |
| `labels` | `{ thumb, minThumb, maxThumb }` | aria-label (i18n) |

Ref: root `<div>`.

## 4. Keyboard + ARIA (APG Slider / Multi-thumb)
Arrow Right/Up `+step`, Left/Down `-step` (RTL mein Left/Right ulte), PageUp/PageDown `10*step`, Home/End min/max.
Range mein thumb doosre ko cross nahi karta; uske `aria-valuemin/max` doosre thumb ki value hote hain.
`aria-valuenow`, `aria-valuetext`, `aria-orientation="horizontal"`, `aria-disabled`, `aria-readonly`.

## 5. Visual + motion
Position `inset-inline-start: %` (logical, RTL free). Track click par thumb kood ke aata hai (`--sl-duration-fast`), drag ke
dauraan transition off. Thumb hover/active par ring, active par `scale(1.1)`. CSS vars: `--sl-slider-track-height`,
`--sl-slider-thumb-size`, `--sl-slider-track-bg`, `--sl-slider-range-bg`, `--sl-slider-thumb-bg`.

## 6. Stories
Default, Controlled, Range, Marks, Step + format (currency), Sizes, States, InField, RTL, Customised, Dark.

## 7. Design sawaal (default chuna)
- Range form submit: ek name do inputs (`FormData.getAll`) ya `name_min/name_max`? **Default: same name, do inputs.**
- Vertical orientation? **Abhi nahi** (v0.3), enterprise forms mein kam lagta hai.
- Tooltip keyboard focus par bhi? **Haan** (`:focus-visible`), taaki keyboard user ko value dikhe.

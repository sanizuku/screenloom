---
"@screenloom/ui": minor
---

Add four controls:

- `Switch`: `role="switch"` toggle with label/description, sizes, spring thumb, `name`/`value` form submit, disabled/readOnly, `classNames` slots and `--sl-switch-*` variables.
- `Slider`: single and range (two thumbs), min/max/step, APG keyboard (arrows, PageUp/PageDown, Home/End), RTL, marks, glass value tooltip, pointer capture, hidden inputs and `formatValue`.
- `NumberInput`: `Field`-aware spinbutton with stepper (hold to repeat), Shift = 10x, clamp on blur, `precision`, `format` = number/currency/percent via `Intl.NumberFormat` (Indian grouping with `en-IN`), raw edit on focus and smart paste ("1,23,456.50").
- `ColorPicker`: trigger + glass popover (or `inline`), saturation/brightness area, hue and alpha sliders, HEX/RGB/HSL inputs, presets, recent colors (localStorage), EyeDropper where supported and WCAG contrast badges. Value is `#rrggbb` / `#rrggbbaa`.

Also exports pure helpers: `parseColor`, `normalizeHex`, `toHex`, `contrastRatio`, `wcagLevel`, `readableTextColor`, `parseLocaleNumber`.

# Switch: design spec (v0.2)

> Status: draft. Package: `@screenloom/ui`. CSS block: `sl-switch`. Design language: `design-language.md` follow karo.

## 1. Kya hai, kab use karein
On/off setting jo **turant** lagti hai (jaise "Email notifications", "Active"). Form ke "agree to terms" jaisa
"submit par lagega" wala boolean ho to `Checkbox` lo. Switch = setting, Checkbox = selection.

## 2. Anatomy
```
root (sl-switch)                 data-state="checked|unchecked", data-size, data-disabled, data-readonly, data-invalid
├── control (sl-switch__control) <button role="switch" aria-checked>
│   └── thumb (sl-switch__thumb) gola, transform se slide (--sl-ease-spring)
├── label (sl-switch__label)     <label for=control>, optional
│   └── description (sl-switch__description) optional, aria-describedby
└── hidden input                 sirf checked + name ho tab (native checkbox jaisa)
```
`classNames` slots: `root`, `control`, `thumb`, `label`, `description`.

## 3. Props
| Prop | Type | Default | Note |
|---|---|---|---|
| `checked` / `defaultChecked` | boolean | `false` | controlled / uncontrolled |
| `onChange` | `(checked: boolean) => void` | | library convention: value ke saath |
| `label`, `description` | ReactNode | | |
| `labelPosition` | `"end" \| "start"` | `"end"` | settings list mein `start` acha lagta hai |
| `size` | `sm \| md \| lg` | `md` | |
| `name`, `value` | string | `value="on"` | checked par hidden input submit hota hai |
| `disabled`, `readOnly`, `invalid` | boolean | | readOnly focusable rehta hai, toggle nahi hota (`aria-readonly`) |
| `labels` | `{ on?: string; off?: string }` | | optional track ke andar text (i18n) |

Ref: `<button>` par. Baaki native button props pass-through.

## 4. Keyboard + ARIA (APG Switch)
- `Space` / `Enter`: toggle (native button click).
- `role="switch"`, `aria-checked`, label `for` se naam; `Field` ke andar `useFieldProps` se id / describedby / invalid.

## 5. Visual + motion
- Track `--sl-radius-full`; off = `--sl-color-border-strong`, on = `--sl-gradient-primary` + hover `--sl-glow-primary`.
- Thumb `transform: translateX()` se slide, `--sl-duration-normal` + `--sl-ease-spring`. RTL mein ulta (`[dir=rtl]`).
- Press par thumb thoda chauda (`scale`), reduced motion mein band.
- State sirf color se nahi: thumb position bhi badalti hai (color-blind safe).
- CSS vars: `--sl-switch-width`, `--sl-switch-height`, `--sl-switch-thumb-size`, `--sl-switch-track-off`, `--sl-switch-track-on`, `--sl-switch-thumb-bg`.

## 6. Stories
Default, Controlled, Sizes, States (disabled, readOnly, invalid), InField, SettingsList (labelPosition start + description), Customised, Dark.

## 7. Design sawaal (default chuna)
- Hidden input sirf checked par (native checkbox jaisa) ya hamesha "true/false"? **Default: native jaisa.**
- onChange naam vs onCheckedChange? **Default: `onChange(checked)`**, RadioGroup/DatePicker jaisa.

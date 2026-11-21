# NumberInput: design spec (v0.2)

> Status: draft. Package: `@screenloom/ui`. CSS block: `sl-numberinput`.

## 1. Kya hai, kab use karein
Amount, quantity, rate, percent jaise numbers. Blur par formatted dikhta hai (`₹1,23,456.50`), focus par raw edit (`123456.5`).
Phone, PIN, account number jaise "digits jo number nahi hain" ke liye **mat** use karo (MaskedInput aayega).

## 2. Anatomy
```
root (sl-numberinput)           data-size, data-invalid, data-disabled, data-readonly, data-focused
└── control (sl-control sl-numberinput__control)
    ├── input (sl-numberinput__input)  type="text" inputMode="decimal" role="spinbutton"
    └── stepper (sl-numberinput__stepper)
        ├── increment (sl-numberinput__increment)  tabIndex -1, hold karne par repeat
        └── decrement (sl-numberinput__decrement)
hidden input (name ke saath, raw number)
```
Slots: `root`, `control`, `input`, `stepper`, `increment`, `decrement`.

## 3. Props
| Prop | Type | Default |
|---|---|---|
| `value` / `defaultValue` | `number \| null` | `null` |
| `onChange` | `(value: number \| null) => void` | commit par (blur, Enter, step), har keystroke par nahi |
| `min`, `max`, `step` | number | step 1 |
| `precision` | number | step ke decimals; currency mein 2 |
| `format` | `"number" \| "currency" \| "percent"` | `number` |
| `locale` | string | browser; `en-IN` = Indian grouping (1,23,456) |
| `currency` | string | `INR` |
| `formatOptions` | `Intl.NumberFormatOptions` | extra control |
| `hideStepper`, `size`, `invalid`, `name`, `labels { increment, decrement }` | | |

Ref: visible `<input>`.

## 4. Keyboard + ARIA (APG Spinbutton)
ArrowUp/Down `±step` (Shift = 10x), PageUp/Down `±10 step`, Home/End min/max (agar diye hain), Enter commit, Escape draft revert.
`role="spinbutton"`, `aria-valuenow/min/max`, `aria-valuetext` (formatted). Field ke saath `useFieldProps`.

## 5. Parsing
Locale ke group + decimal separator `Intl.NumberFormat#formatToParts` se. Paste "1,23,456.50" → 123456.5. Currency symbol,
`%`, spaces hata do. Unicode minus aur `(100)` = -100 bhi. Galat text par blur → pichhli value wapas.

## 6. Stories
Default, Controlled, Currency (en-IN INR, en-US USD), Percent, MinMaxStep, Sizes, States, InField, Customised, Dark.

## 7. Design sawaal (default chuna)
- Percent value 15 = "15%" ya 0.15 = "15%"? **Default: 15 = 15%** (forms aur DB mein yahi aata hai).
- onChange har keystroke par? **Nahi, commit par** (DatePicker jaisa).
- Min/max typing ke time block? **Nahi, blur par clamp**; stepper/arrow kabhi bahar nahi jaate.

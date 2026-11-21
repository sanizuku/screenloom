# ScreenLoom design language

> Har control isi ke hisaab se banega, taaki library "random" na lage aur ek product jaisi dikhe.
> Agents (`ui-designer`, `component-builder`, `component-reviewer`) ye file har kaam se pehle padhte hain.

## 1. Personality

**"Calm enterprise, modern finish."** Data-heavy screens par aankhon ko shaant rakhna (saaf layout, hairline borders,
dense par saans lene layak spacing), aur upar ek modern finish: glass floating layers, soft depth, chhoti tez animations.
Animation kabhi kaam ko slow nahi kare: data entry user din mein hazaar baar click karta hai.

## 2. Surfaces (teen layer)

| Layer | Kahan | Style |
|---|---|---|
| Base | Page, form, grid | `--sl-color-bg` / `--sl-color-surface`, 1px `--sl-color-border`, `--sl-radius-md` |
| Raised | Card, panel, ribbon body, tab panel | `--sl-color-surface` + `--sl-shadow-1` ya `--sl-shadow-2` |
| Floating | Popover, menu, tooltip, dialog, ribbon dropdown, color picker panel | **Glass**: `.sl-glass` class ya same tokens (`--sl-surface-floating`, `--sl-glass-border`, `--sl-shadow-3`, `--sl-glass-highlight`, `backdrop-filter`), `--sl-radius-lg` |

- Glass sirf **floating** layers par. Base inputs par glass nahi (text padhna mushkil hota hai).
- `--sl-surface-floating` override karke user poori library ka glass band kar sakta hai (solid). `@supports` fallback `styles.css` mein hai.
- Glass ke upar text hamesha `--sl-color-text`, contrast WCAG AA.

## 3. Motion

Tokens: `--sl-duration-fast` (120ms: hover, press), `--sl-duration-normal` (200ms: open/close, popover), `--sl-duration-slow` (320ms: tab indicator, panel resize).
Easing: `--sl-ease-out` (default, enter), `--sl-ease-in-out` (move/resize), `--sl-ease-spring` (chhoti cheez par playful pop: checkbox tick, switch thumb, selected day).

Patterns (keyframes `styles.css` mein, reuse karo, naye mat banao jab tak zaroori na ho):
- **Enter floating layer**: `animation: sl-pop-in var(--sl-duration-normal) var(--sl-ease-out)`, `transform-origin` trigger ki taraf
- **Fade**: `sl-fade-in` (tooltip, overlay)
- **Slide up**: `sl-slide-up` (toast, inline message, tab panel content)
- **Press**: `transform: scale(0.97)` on `:active`
- **Indicator move** (tabs underline, segmented control, switch thumb): `transform` transition, layout props (width/left) animate mat karo
- Sirf `transform` aur `opacity` animate karo (GPU friendly). `height`/`width` animate karna ho to `grid-template-rows: 0fr → 1fr` trick.
- `prefers-reduced-motion`: duration tokens apne aap ~0 ho jaate hain; `transform` wale press/pop effects bhi us media query mein band karo.

## 4. Color use

- Sirf tokens. Accent = `--sl-color-primary`; selected/hover tint = `--sl-color-primary-subtle`; primary action par `--sl-gradient-primary` + hover par `--sl-glow-primary`.
- State hamesha color ke alawa kisi aur signal se bhi (icon, underline, line-through, weight), color-blind users ke liye.
- Naya token chahiye to `packages/tokens/src/tokens.css` mein light + dono dark blocks mein, aur `index.ts` ke list mein (sirf color tokens).

## 5. Shape aur density

- Radius: controls `--sl-radius-md`, floating/cards `--sl-radius-lg`, pills/switch/chips `--sl-radius-full`.
- Size: `data-size="sm|md|lg"` (shared rules `.sl-control[data-size]`). Enterprise default `md`; `sm` dense grids aur ribbon ke liye.
- Icons: inline SVG, `currentColor`, 16px (sm 14px), `aria-hidden` jab label saath ho. Koi icon library dependency nahi.

## 6. Enterprise checklist (har control)

- Keyboard-first: poora kaam bina mouse ke (APG pattern follow karo), visible `:focus-visible` ring (`--sl-shadow-focus`)
- Controlled + uncontrolled, `name` ke saath real `<form>` submit (hidden input agar zaroori)
- `disabled`, `readOnly`, `invalid` states; `Field` + `useFieldProps` integration jahan text-like ho
- i18n: saara text `labels` prop se, RTL mein layout na toote (logical properties: `margin-inline-start`, `inset-inline-end`)
- Customisation 3 layer: global tokens → component CSS vars (`--sl-<control>-*`) → `className` / `classNames` slots / `data-*` state attributes
- Koi runtime dependency nahi jab tak bahut zaroori na ho; tree-shakable named export
- Tests: behaviour + keyboard + ARIA; Story: Default, Sizes, States, InField, Customised, Dark; Playground registry entry

## 7. Control catalog (priority)

Bana hua: Button, Input, Textarea, Select, Checkbox, RadioGroup, Field, DatePicker.

| Batch | Controls |
|---|---|
| Batch 1 (abhi) | Ribbon (tabs + groups + large/small buttons + toggle + dropdown + overflow), Tabs, Tooltip, ColorPicker (saturation area, hue, alpha, hex/rgb input, swatches, eyedropper jahan supported), Switch, Slider (single + range), NumberInput (step, min/max, currency/percent format) |
| Batch 2 | ComboBox/AutoComplete (async), MultiSelect (chips), TimeInput, FileUpload (drag-drop, progress), Dialog/Modal, Toast, Menu/DropdownMenu, SegmentedControl, Badge/Tag |
| Batch 3 | DataGrid wrapper, TreeSelect, MaskedInput (phone, PAN, IFSC jaise formats), RichText (lite), Signature, Stepper/Wizard, Breadcrumb, Skeleton |

## 8. Signature aur uniqueness bar (generic mat banao)

ScreenLoom ka naam **loom** (karghā) se hai: JSON ke dhaage (threads) se screens bunna. Ye hamari visual signature hai:
- **Thread motif**: warp/weft lines (patli criss-cross lines) jo background, loaders, focus/selection aur transitions mein subtly dikhein. Jaise "dhaaga bun raha hai". Overdo nahi: 1-2 jagah per screen.
- **Woven reveal**: naya content aate waqt threads se "bunta" hua reveal (clip-path/mask + transform), chhota aur tez.
- **Brand color hi hero hai**: gradients aur glow `--sl-color-primary` se bante hain, isliye Theme Builder se brand badle to signature bhi badle.

Ye "generic AI UI" ke nishaan hain, inse bacho:
- Har jagah same purple-blue gradient, random emoji, "✨" icons, bina wajah ke glassmorphism blobs
- Centered hero + 3 feature cards wala template, har card par same shadow
- Animation jo kuch nahi batati (sirf ghoomna/uchhalna). Har motion ka matlab ho: kahan se aaya, kya badla, kya select hua.
- Placeholder copy ("Lorem ipsum", "Welcome to your dashboard")

Har showcase surface (playground, docs, demo app) ko poochho: "Kya ye screenshot dekh ke koi bolega ki ye ScreenLoom hai?" Agar nahi, to signature missing hai.

# DatePicker: design spec (v0.2)

> Status: draft. Package: `@screenloom/ui`. CSS block: `sl-datepicker`.
> Ye spec ScreenLoom ka pehla spec hai, isliye iske naming aur structure baaki controls (ComboBox, TimeInput) ke liye template banenge.

---

## 1. Kya hai aur kab use karein

DatePicker ek **single date** chunne ka control hai: user text input mein date type kar sakta hai **ya** calendar popover se click/keyboard se chun sakta hai. Value hamesha `"YYYY-MM-DD"` string (ya `null`) hoti hai.

**Kab use karein**
- Form ki koi bhi ek date: joining date, invoice date, due date, date of birth.
- Generic master screen ke filter panel mein "From" ya "To" jaise alag-alag single date fields.

**Kab use NA karein**
- Date range (from-to ek saath): abhi range picker nahi hai, do alag DatePicker lagao (dekho section 12, Future).
- Date + time ek saath: aage aane wala `TimeInput` saath mein lagao.
- Sirf month/year (jaise "billing month", "card expiry"): alag MonthPicker better hai, full calendar yahan noise hai.
- Bahut door ki date jahan user hamesha type karta hai aur calendar kabhi nahi kholta: plain `Input` + parsing bhi chal jaata hai, par DatePicker ka typing mode bhi ye case cover karta hai.

---

## 2. Anatomy

```
root (sl-datepicker)
├── control (sl-datepicker__control)        input + buttons ka border wala box
│   ├── input   (sl-datepicker__input)       type karne wala text box
│   ├── clear   (sl-datepicker__clear)       "x" button, sirf value ho tab
│   └── trigger (sl-datepicker__trigger)     calendar icon button
├── hiddenInput                              <input type="hidden" name=... value="YYYY-MM-DD">
└── popover (sl-datepicker__popover)         role="dialog"
    ├── header (sl-datepicker__header)
    │   ├── prev   (sl-datepicker__nav sl-datepicker__nav--prev)
    │   ├── title  (sl-datepicker__title)    "March 2026", aria-live
    │   └── next   (sl-datepicker__nav sl-datepicker__nav--next)
    ├── grid    (sl-datepicker__grid)        role="grid" (table)
    │   ├── weekday (sl-datepicker__weekday) column header: Mo Tu We ...
    │   └── day     (sl-datepicker__day)     har date ka button
    └── footer  (sl-datepicker__footer)
        └── today (sl-datepicker__today)     "Aaj" button
```

`classNames` slot keys: `root`, `control`, `input`, `clear`, `trigger`, `popover`, `header`, `nav`, `title`, `grid`, `weekday`, `day`, `footer`, `today`.

**Kyun:** naam BEM jaise (`block__element`) rakhe kyunki existing CSS mein bhi `sl-field__label`, `sl-check__input` yahi pattern follow karta hai. Slot key aur CSS class ka naam same rakhne se user ko ek hi list yaad rakhni padti hai.

**Kyun `control` wrapper alag hai:** existing `.sl-control` class border, focus ring, invalid border deti hai. Input ke andar buttons lagane ke liye border ko input se hata kar wrapper par lagana padega, warna icon input ke bahar dikhega. Wrapper par `.sl-control` reuse karo, taaki DatePicker baaki inputs ke saath pixel-same dikhe.

**Kyun hidden input:** visible input mein display text (`15/03/2026`) hota hai, par native form submit ya `FormData` ko ISO value chahiye. `name` prop hidden input par jaata hai.

**Day ke modifiers** class se nahi, `data-*` se:

| Attribute        | Matlab                                      |
|------------------|---------------------------------------------|
| `data-today`     | aaj ki date                                 |
| `data-selected`  | chuni hui value                             |
| `data-outside`   | pichhle/agle month ki date (grid fill karne ke liye) |
| `data-disabled`  | min/max ke bahar ya `isDateDisabled` true   |
| `data-focused`   | roving focus abhi is cell par hai           |
| `data-weekend`   | locale ke hisaab se weekend                 |

**Kyun data-attributes:** ek day ek saath today + selected + weekend ho sakta hai. Class modifiers (`--today--selected`) ka combination explode hota hai; `[data-today][data-selected]` CSS mein saaf likha jaata hai.

---

## 3. Variants aur sizes

### Size

| Size | Height (`--sl-datepicker-height`) | Font                 | Cell size | Kab use karein |
|------|-----------------------------------|----------------------|-----------|----------------|
| `sm` | `1.875rem` (Button `sm` jaisa)    | `--sl-font-size-sm`  | `2rem`    | DataGrid ke inline edit, filter bar, dense master screen |
| `md` (default) | `var(--sl-control-height)` | `--sl-font-size-md` | `2.25rem` | Normal forms |
| `lg` | `2.75rem`                         | `--sl-font-size-lg`  | `2.75rem` | Touch/tablet screens, kiosk, accessibility-first forms |

**Kyun `sm` ki height Button `sm` se match:** filter bar mein DatePicker aur "Search" button ek line mein hote hain; height alag ho to row tedhi dikhti hai.

**Kyun `lg` ka cell 2.75rem (44px):** touch target ki recommended minimum size ~44px hai.

> Note: abhi `Input` mein `size` prop nahi hai. Suggestion: size ko shared `data-size` attribute + `.sl-control[data-size="sm"]` rule ke roop mein banao, taaki baad mein Input/Select bhi isi ko use kar saken. (HTML `<input>` ka apna `size` attribute hota hai; isliye DatePicker ka prop type `"sm" | "md" | "lg"` rakho aur native `size` ko `Omit` karo.)

### Variant

v0.2 mein **koi `variant` nahi**. **Kyun:** baaki form controls ka bhi ek hi look hai; variant tab add karo jab koi asli need aaye (jaise borderless "inline" variant DataGrid cell ke liye, wo v0.2 ke DataGrid wrapper ke time decide karna).

---

## 4. States

| State | Visual change | Token / CSS | Kyun |
|-------|---------------|-------------|------|
| **default** | `control` border `--sl-color-border`, bg `--sl-color-surface`, icon `--sl-color-text-muted` | `.sl-control` jaisa | Baaki inputs se consistent |
| **hover** | border `--sl-color-border-strong`; trigger/clear par bg `--sl-color-surface-muted` | existing hover rule | Clickable area ka signal |
| **focus-visible** | `control` par border `--sl-color-focus` + `--sl-shadow-focus` (`:focus-within` se); trigger/clear ke apne focus par sirf ring | `--sl-shadow-focus` | Ring pure box par dikhe, sirf input par nahi, warna buttons alag lagte hain |
| **open** | `data-state="open"` root par; trigger icon `--sl-color-primary`; control focus look bana rehta hai | `--sl-color-primary` | User ko pata rahe popover kis field ka hai |
| **disabled** | bg `--sl-color-surface-muted`, text `--sl-color-text-muted`, `cursor: not-allowed`, trigger + clear disabled | existing `:disabled` rule | Same jaisa Input |
| **readOnly** | bg `--sl-color-surface-muted`, value dikhti hai, select/copy ho sakti hai, **trigger aur clear hide** | existing `[readonly]` rule | View mode mein false affordance (calendar icon jo kuch nahi karta) confusion deta hai |
| **invalid** | border `--sl-color-danger`, `aria-invalid="true"`, `data-invalid` | `--sl-color-danger` | Field ki error message ke saath match |
| **loading** | trigger mein `.sl-spinner` (Button wala), popover ke grid par `aria-busy="true"` aur days `opacity: .5` | existing spinner | Jab disabled dates (holidays) server se aa rahe hon; galat date select hone se bachao |
| **empty** | placeholder = format hint (`DD/MM/YYYY`) color `--sl-color-text-muted`; clear button hidden; `data-empty` | `--sl-color-text-muted` | Placeholder mein format dikhana "kaise type karun" ka sawaal khatam kar deta hai |

**Popover ke andar day states**

| Day state | Visual | Token |
|-----------|--------|-------|
| normal | text `--sl-color-text`, transparent bg | |
| hover | bg `--sl-color-primary-subtle` (naya token) | |
| focused (`data-focused` + focus-visible) | `--sl-shadow-focus` ring | |
| today | 1px inset ring `--sl-color-primary`, font-weight 600 | |
| selected | bg `--sl-color-primary`, text `--sl-color-on-primary` | |
| outside | text `--sl-color-text-muted` | |
| disabled | text `--sl-color-text-muted`, `text-decoration: line-through`, `cursor: not-allowed`, hover effect nahi | |
| weekend | default mein koi change nahi; user `[data-weekend]` se style kar sakta hai | |

**Kyun disabled day par line-through:** sirf color se "disabled" batana color-blind user ke liye kaafi nahi (WCAG 1.4.1, "use of color").

**Kyun weekend default mein plain:** har business ka weekend alag hai (kuch jagah Friday-Saturday). Opinionated color dene se zyada achha hook dena hai.

---

## 5. Customisation API

### 5.1 Value type ka faisla: ISO string `"YYYY-MM-DD"`

**Faisla:** `value: string | null`, format hamesha `"YYYY-MM-DD"` (calendar date, koi time/timezone nahi). Khaali = `null`.

| | `Date` object | ISO string `"YYYY-MM-DD"` |
|---|---|---|
| JSON mein save | `JSON.stringify` se `"2026-03-14T18:30:00.000Z"` ban jaata hai (UTC shift!) | jaisa hai waisa jaata hai |
| Timezone bug | `new Date("2026-03-15")` UTC midnight hai; IST jaisi negative/positive offset wali jagah par din badal sakta hai | koi time nahi, to shift nahi |
| Stored procedure `DATE` param | convert karna padta hai | seedha pass ho jaata hai |
| Compare (min/max) | `getTime()` chahiye | string compare hi kaafi (`"2026-01-05" < "2026-02-01"`), kyunki format fixed-width hai |
| Form-engine JSON schema mein `defaultValue`, `min` | likh hi nahi sakte | `"min": "2026-01-01"` seedha |
| Equality / React re-render | har baar naya object, `===` fail | `===` kaam karta hai |
| Native `<input type="date">` | | yahi format use karta hai |

**Kyun ISO:** form ki date ek "calendar date" hai, "moment in time" nahi. Date object moment in time hai, isliye galat model hai. ISO string backend, JSON schema aur URL query sab jagah bina conversion chal jaata hai.

**Kyun `null`, `""` nahi:** stored procedure ko `NULL` bhejna hai, aur `null` ka matlab saaf hai "value nahi hai". `""` aur `null` dono allow karne se har jagah do check lagte hain. (Agar input mein `""` aaye to use `null` treat karo.)

**Andar kaise kaam karega:** ISO parse karo `{ year, month, day }` mein ya **local** `new Date(y, m - 1, d)` se. Kabhi `new Date("YYYY-MM-DD")` mat karo (wo UTC hai).

> Interview angle: "Date picker ki value ISO date string kyun?" Bolo: date-only value ka timezone nahi hota, `Date` object timezone le aata hai aur serialization par din shift ho sakta hai; ISO string JSON-safe, comparable aur backend-friendly hai.

### 5.2 Props

| Prop | Type | Default | Kyun |
|------|------|---------|------|
| `value` | `string \| null` | | Controlled mode (form library, form-engine) |
| `defaultValue` | `string \| null` | `null` | Uncontrolled mode, simple forms |
| `onChange` | `(value: string \| null) => void` | | Sirf **valid committed** value par fire hota hai, har keystroke par nahi |
| `min` / `max` | `string` (ISO) | | Native `<input type="date">` jaisa naam, seekhna aasaan |
| `isDateDisabled` | `(iso: string) => boolean` | | Holidays, "sirf weekdays" jaise rules. Function, array nahi, taaki rule-based logic chal sake |
| `format` | `string` (tokens `DD`, `MM`, `YYYY`, separator `/ - .`) | locale se nikla, fallback `"DD/MM/YYYY"` | Display + typing dono isi format mein. Chhota token set = chhota parser |
| `locale` | `string` | browser locale | Month/weekday naam `Intl.DateTimeFormat` se |
| `weekStartsOn` | `0`-`6` (0 = Sunday) | `1` (Monday) (dekho design sawaal) | `Intl` ka week info har browser mein nahi hai, isliye prop chahiye |
| `clearable` | `boolean` | `true` | Optional fields mein value hatana common hai; required field mein `false` kar do |
| `placeholder` | `string` | `format` khud (`DD/MM/YYYY`) | Format hint free mein |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Section 3 |
| `disabled`, `readOnly`, `required`, `invalid` | `boolean` | | `useFieldProps` se Field ke saath merge |
| `loading` | `boolean` | `false` | Async disabled dates |
| `name` | `string` | | Hidden input par jaata hai (ISO value) |
| `open` / `defaultOpen` / `onOpenChange` | `boolean` / `boolean` / `(open) => void` | | Popover bhi controlled ho sake (jaise "field focus hote hi kholo" behaviour) |
| `labels` | object (niche) | English defaults | i18n |
| `formatDate` / `parseDate` | `(iso) => string` / `(text) => string \| null` | built-in | Format string se kaam na chale to escape hatch |
| `onInputError` | `(text, reason: "parse" \| "min" \| "max" \| "disabled") => void` | | Form apna error message dikha sake |
| `className`, `classNames`, `style` | | | 5.5 dekho |
| baaki native input props | | | Pass-through `input` par (`autoFocus`, `onBlur`, `aria-*`) |

`ref`: `forwardRef` **input element** par. **Kyun:** form-engine ka `focusField()` ref API seedha `ref.current.focus()` call karega; baaki controls ka bhi ref native element par hai.

`labels` keys:

| Key | Default | Use |
|-----|---------|-----|
| `openCalendar` | `"Open calendar"` | trigger `aria-label` |
| `clear` | `"Clear date"` | clear `aria-label` |
| `prevMonth` / `nextMonth` | `"Previous month"` / `"Next month"` | nav `aria-label` |
| `today` | `"Today"` | footer button text |
| `dialogLabel` | `"Choose date"` | dialog ka naam (title ke saath) |
| `selectedDate` | `(formatted) => "Selected date: " + formatted` | trigger ka description |

**Kyun labels ek object mein:** har text ke liye alag prop (`clearLabel`, `todayLabel` ...) prop list ko lamba kar deta hai; ek object ko app ek jagah se (i18n file) pass kar sakta hai.

### 5.3 Typing + commit rules

1. User type karta hai: input local text state mein rehta hai, `onChange` fire **nahi** hota.
2. **Blur ya Enter** par text parse hota hai:
   - valid aur allowed: `onChange(iso)`, text normalize ho jaata hai (`5/3/26` se `05/03/2026`).
   - khaali: `onChange(null)`.
   - invalid (parse fail, min/max ke bahar, disabled date): text **wahi rehta hai**, `data-input-error` lagta hai, invalid border dikhta hai, `onInputError` fire hota hai, value **nahi** badalti.
3. Calendar se select: turant `onChange(iso)`, popover band, focus input par wapas.

**Kyun blur/Enter par commit, har keystroke par nahi:** `1/0` jaisa adhoora text parse karoge to value beech mein galat dates se guzregi, aur form-engine ke rules ("A badle to B disable") galat fire honge.

**Kyun invalid text ko revert nahi karte:** user ka type kiya hua text gayab ho jaana frustrating hai; wo galti dekh kar theek kar sake. (Ye design sawaal bhi hai, end mein dekho.)

### 5.4 Theme level (global tokens)

DatePicker sirf existing `--sl-color-*`, `--sl-space-*`, `--sl-radius-*`, `--sl-font-*`, `--sl-shadow-focus` use karta hai, plus section 8 ke 2 naye tokens. Brand color badla (`--sl-color-primary`), to selected day, today ring, focus sab apne aap badal jaayenge.

### 5.5 Component level (CSS variables)

`.sl-datepicker` par define, default global tokens se:

```css
.sl-datepicker {
  --sl-datepicker-height: var(--sl-control-height);
  --sl-datepicker-radius: var(--sl-radius-md);
  --sl-datepicker-popover-bg: var(--sl-color-surface);
  --sl-datepicker-popover-border: var(--sl-color-border);
  --sl-datepicker-popover-shadow: var(--sl-shadow-popover);
  --sl-datepicker-popover-padding: var(--sl-space-3);
  --sl-datepicker-cell-size: 2.25rem;
  --sl-datepicker-cell-radius: var(--sl-radius-sm);
  --sl-datepicker-day-hover-bg: var(--sl-color-primary-subtle);
  --sl-datepicker-day-selected-bg: var(--sl-color-primary);
  --sl-datepicker-day-selected-text: var(--sl-color-on-primary);
  --sl-datepicker-today-ring: var(--sl-color-primary);
  --sl-datepicker-icon-color: var(--sl-color-text-muted);
}
```

**Kyun component variables:** user ko sirf DatePicker ke cells gol (`--sl-datepicker-cell-radius: 999px`) chahiye to global `--sl-radius-sm` badalne se poori app badal jaayegi. Component variable ek control tak limited override deta hai, bina CSS specificity ladaai ke.

### 5.6 Instance level

- `className`: root par merge (`cx("sl-datepicker", className)`).
- `classNames={{ trigger: "...", day: "..." }}`: har slot par extra class (utility CSS users ke liye).
- `style`: root par; isse ek instance ke CSS variables bhi set ho jaate hain (`style={{ "--sl-datepicker-cell-size": "2rem" }}`).
- Root ke `data-*`:

| Attribute | Value |
|-----------|-------|
| `data-state` | `"open"` / `"closed"` |
| `data-size` | `"sm"` / `"md"` / `"lg"` |
| `data-invalid` | invalid ho to (Field error, `invalid` prop, ya `data-input-error`) |
| `data-input-error` | typed text invalid hai |
| `data-disabled` / `data-readonly` / `data-loading` / `data-empty` | state ho to |

**Popover ke liye zaroori baat:** popover top layer mein render hota hai (section 5.8), isliye DOM mein root ka "child" hote hue bhi CSS ke liye `data-state` popover par bhi lagao, aur `classNames.popover` diya ho to wahan lagao. Descendant selector (`.my-form .sl-datepicker__popover`) kaam karega kyunki element DOM tree mein wahi hai.

### 5.7 Dependency faisla 1: date library ya native `Date` + `Intl`

| Option | Bundle | Fayda | Nuksan |
|--------|--------|-------|--------|
| Full-featured date library | kuch KB se kaafi KB tak (tree-shaking par depend) | parsing/format ready, edge cases tested | Library users ke bundle mein extra; peer-dep version conflict; seekhne ko kam milta hai |
| Native `Date` + `Intl.DateTimeFormat` + chhota internal `date-utils.ts` | ~1-2 KB | zero dependency, `Intl` se month/weekday naam har locale mein free | Parser khud likhna padega (chhota hai kyunki token set chhota hai) |

**Recommendation: native + internal `date-utils.ts`.**
**Kyun:** humein sirf ye chahiye: ISO parse/format, `addDays`, `addMonths` (month-end clamp ke saath: 31 Jan + 1 month = 28/29 Feb), `startOfWeek`, month grid banana, `DD/MM/YYYY` parse/format. Ye 100-150 line ke pure functions hain, aur unit-test karna bahut aasaan hai. UI library ka zero-dependency hona adoption mein bada plus hai.

Locale cheezein: month naam `Intl.DateTimeFormat(locale, { month: "long", year: "numeric" })`, weekday chhota naam `{ weekday: "short" }` / screen reader ke liye `{ weekday: "long" }`, day ka full label `{ dateStyle: "full" }`.

### 5.8 Dependency faisla 2: popover positioning

| Option | Fayda | Nuksan |
|--------|-------|--------|
| Positioning library | flip/shift/scroll sab handled | extra dependency, ek aur API seekhni |
| Root `position: relative` + popover `position: absolute` | sabse simple | modal/DataGrid ke `overflow: hidden` ke andar popover **cut jaata hai**; z-index ladaai |
| Native HTML `popover` attribute (top layer) + chhota manual positioning | top layer mein hone se clipping aur z-index dono khatam; light-dismiss (bahar click, Escape) browser deta hai; modern browsers mein supported | position khud calculate karni padti hai (`getBoundingClientRect`), scroll/resize par update |

**Recommendation: native `popover` + manual position, koi dependency nahi.**
Positioning logic: input ke neeche left-align; agar neeche jagah kam hai to upar flip; agar right edge se bahar ja raha ho to left shift. Open hone par aur `scroll` (capture) / `resize` par recalc.

**Kyun:** enterprise forms aksar modal ya grid ke andar hote hain jahan `overflow: hidden` hota hai; top layer ye problem jad se khatam karta hai. Flip + shift ka basic logic ~30 line hai. Agar baad mein edge cases badhein (nested scroll containers, virtual keyboards), to positioning library ko **ek internal function ke peeche** swap kar sakte ho; isliye positioning ko `positionPopover(anchor, popover)` jaisi alag function mein rakhna.

(CSS anchor positioning bhi aage ka raasta hai, par browser support poora hone tak manual fallback chahiye hi, isliye abhi manual.)

> Interview angle: "Dropdown modal ke andar cut kyun ho jaata hai?" Bolo: parent ka `overflow: hidden` absolute child ko clip karta hai; fix hai portal ya top layer (`popover`/`dialog`), jo element ko stacking context se bahar render karta hai.

---

## 6. Accessibility

Pattern: WAI-ARIA APG ka "date picker dialog" (combobox nahi, dialog + grid).

**Input**
- `useFieldProps()` se `id`, `required`, `aria-describedby` (hint + error), `aria-invalid` apne aap. `Field` ka `<label htmlFor>` input se judta hai.
- Format hint: agar user ne `hint` nahi diya to bhi screen reader ko format batana hai: input par `aria-describedby` mein ek visually-hidden "Format: DD/MM/YYYY" span ka id **add** karo (Field ke ids ke saath join, replace nahi).
- `autoComplete="off"` (browser ki purani values dropdown calendar ke upar na aayein).
- `inputMode="numeric"` jab format sirf numbers + separators ho (mobile par number keypad).

**Trigger button**
- `type="button"` (form submit na ho), `aria-label={labels.openCalendar}`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls={popoverId}`.
- Value ho to `aria-describedby` mein "Selected date: Sunday, 15 March 2026".
- Screen reader: "Open calendar, button, collapsed, Selected date: Sunday, 15 March 2026".

**Clear button**: `type="button"`, `aria-label={labels.clear}`. Clear ke baad focus input par.

**Popover**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}` (dialog ka naam "March 2026" ban jaata hai; `aria-label` mein `labels.dialogLabel` bhi chal sakta hai).
- Title `aria-live="polite"`: month badalne par "April 2026" announce hota hai.
- Focus trap: Tab sirf prev, next, grid (ek hi tab stop), today ke beech ghoomta hai.
- Band hone par focus **wapas input** par (Escape ya select dono mein).

**Grid**
- `<table role="grid" aria-labelledby={titleId}>`. Weekday `<th scope="col" abbr="Monday">Mo</th>`, taaki screen reader "Monday" bole.
- Har cell `<td role="gridcell" aria-selected>`, andar `<button>` jiska `aria-label` full date ("Sunday, 15 March 2026"), today par `aria-current="date"`, disabled par `aria-disabled="true"`.
- **Roving tabindex**: sirf ek day button `tabIndex=0`, baaki `-1`.
- Disabled day **focus ho sakta hai** (sirf select nahi). **Kyun:** agar arrows disabled days skip karein to keyboard user ko lagta hai date gayab hai, aur screen reader "dimmed" bol kar reason samjha deta hai.
- Loading mein grid `aria-busy="true"`.

**Contrast (WCAG AA)**
- Text: `--sl-color-text` / `--sl-color-text-muted` dono surface par 4.5:1 se upar (current light/dark values check kar lo).
- Selected day: `--sl-color-on-primary` on `--sl-color-primary`, light aur dark dono mein 4.5:1 se upar.
- Today ring aur focus ring: non-text contrast 3:1 (`--sl-color-primary` vs `--sl-color-surface`).
- Disabled day contrast se exempt hai, par line-through se distinguishable.
- Theme Builder (v0.4) mein ye pairs auto-check hone chahiye.

---

## 7. Keyboard map

**Input par (popover band)**

| Key | Action |
|-----|--------|
| type karna | text edit; commit blur/Enter par |
| `Enter` | text parse + commit |
| `Alt + ArrowDown` | popover kholo, focus selected/aaj ki date par |
| `ArrowDown` | (optional, dekho design sawaal 3) popover kholo |
| `Escape` | uncommitted text ko last valid value par revert |
| `t` (input khaali ya poora selected ho) | aaj ki date (section 9) |

**Calendar grid par**

| Key | Action |
|-----|--------|
| `ArrowLeft` / `ArrowRight` | pichhla / agla din |
| `ArrowUp` / `ArrowDown` | pichhla / agla hafta (same weekday) |
| `Home` / `End` | hafte ka pehla / aakhri din (`weekStartsOn` ke hisaab se) |
| `PageUp` / `PageDown` | pichhla / agla month, same date (month-end clamp: 31 se 30/28) |
| `Shift + PageUp` / `Shift + PageDown` | pichhla / agla saal |
| `Enter` / `Space` | focused date select (disabled ho to kuch nahi), popover band, focus input par |
| `Escape` | popover band, value same, focus input par |
| `Tab` / `Shift + Tab` | dialog ke andar: prev, next, grid, today (focus trap) |

Month ke bahar arrow jaane par calendar apne aap agla/pichhla month dikha deta hai. `min`/`max` ke bahar navigation ruk jaata hai (aur prev/next buttons disabled).

**Kyun Home/End hafte par, month par nahi:** grid ki row ek hafta hai; APG pattern aur doosre grids ka bhi yahi convention hai, isliye users ki muscle memory match karti hai.

---

## 8. Naye tokens

`packages/tokens/src/tokens.css` mein (light `:root` + dono dark blocks):

| Token | Light | Dark | Kahan use |
|-------|-------|------|-----------|
| `--sl-color-primary-subtle` | `color-mix(in srgb, var(--sl-color-primary) 12%, var(--sl-color-surface))` | `color-mix(in srgb, var(--sl-color-primary) 22%, var(--sl-color-surface))` | day hover, aage ComboBox option hover, DataGrid row hover |
| `--sl-shadow-popover` | `0 8px 24px color-mix(in srgb, var(--sl-color-text) 16%, transparent)` | `0 8px 24px color-mix(in srgb, var(--sl-color-bg) 70%, transparent)` | popover, aage ComboBox listbox, menu |

**Kyun dark mein alag mix:** dark mode mein `--sl-color-text` light hota hai, uska shadow "glow" jaisa dikhega. Dark mein shadow background se banta hai aur popover ka 1px `--sl-color-border` hi asli separation deta hai.

**Kyun ye global tokens hain, DatePicker-specific nahi:** ComboBox, Select popover, menus sab ko yahi chahiye. Ek baar banao, sab reuse karein.

Koi hard-coded color nahi; `--sl-shadow-focus` jaisa `color-mix` pattern already tokens mein hai, wahi follow kiya.

---

## 9. Creative touch

### 9.1 Smart typing shortcuts

Input mein ye bhi chalega (blur/Enter par resolve):

| Type karo | Result |
|-----------|--------|
| `t` | aaj |
| `+7`, `-1` | aaj se 7 din baad / 1 din pehle |
| `15` | is month ki 15 tareekh |
| `1503` | 15 March, is saal |
| `150326` / `15032026` | 15 March 2026 (separator optional) |
| `5/3` | 5 March, is saal |

**Kyun enterprise user ka time bachata hai:** data entry operator din mein sau baar dates bharta hai, keyboard se haath nahi hatata. "Due date = aaj + 30" jaisa kaam `+30` Enter se 1 second mein ho jaata hai, calendar kholne ki zaroorat nahi. Parser pure function hai, isliye har shortcut ka unit test likhna aasaan hai. Shortcuts `format` ke order (DD-MM ya MM-DD) ko follow karte hain.

### 9.2 Parsed-date echo (ambiguity guard)

Type karte waqt input ke neeche-right (ya hint ki jagah) ek chhota muted text: "Sun, 15 Mar 2026". Agar text invalid hai to "Date samajh nahi aayi" ya "Max 31/12/2026". `aria-live="polite"` region mein, debounce ke saath.

**Kyun:** `03/04` kisi ke liye 3 April hai, kisi ke liye 4 March. Weekday + month naam ke saath echo galat entry ko **submit se pehle** pakad leta hai, aur `+7` jaise shortcut ka result bhi turant dikh jaata hai. Ye `showParsedPreview` prop se on/off (default on `md`/`lg`, off `sm` kyunki dense grids mein jagah nahi).

---

## 10. Test checklist

**date-utils (pure functions, alag `date-utils.test.ts`)**
- [ ] ISO parse/format round trip; invalid ISO (`2026-02-30`) reject
- [ ] Leap year: `2028-02-29` valid, `2026-02-29` invalid
- [ ] `addMonths` clamp: `2026-01-31` + 1 = `2026-02-28`
- [ ] Month grid: `weekStartsOn` 0 aur 1 dono ke liye pehla cell sahi; hamesha 6 rows (layout jump na ho)
- [ ] Format parse: `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`; single digit (`5/3/2026`); 2-digit year
- [ ] Smart shortcuts: `t`, `+7`, `-1`, `15`, `1503` (test mein "aaj" ko fake timers se fix karo)
- [ ] Timezone: koi function `new Date("YYYY-MM-DD")` use na kare (`TZ` env alag rakh ke test)

**Behaviour**
- [ ] Uncontrolled: `defaultValue` dikhe, select karne par update
- [ ] Controlled: `value` change hone par input text update; `onChange` sirf commit par
- [ ] Type + blur = `onChange(iso)`; invalid text par `onChange` nahi, `onInputError` fire, `aria-invalid="true"`
- [ ] min/max ke bahar ki typed date reject; calendar mein wo days disabled, nav buttons disabled
- [ ] `isDateDisabled` wale days select nahi hote
- [ ] Clear: `onChange(null)`, focus input par; `clearable={false}` par button nahi
- [ ] readOnly: trigger nahi, popover nahi khulta, text select ho sakta hai
- [ ] disabled: sab disabled
- [ ] `name` diya ho to hidden input mein ISO value
- [ ] `open`/`onOpenChange` controlled popover
- [ ] `labels` override dikhte hain; `locale="hi-IN"` par month naam badalte hain

**Accessibility**
- [ ] `Field` ke andar: label click se input focus, `aria-describedby` mein hint + error + format hint teeno
- [ ] Trigger: `aria-expanded` toggle, `aria-haspopup="dialog"`
- [ ] Dialog: `role="dialog"`, `aria-modal`, naam title se
- [ ] Grid: `aria-selected`, `aria-current="date"`, `aria-disabled`; ek hi `tabIndex=0`
- [ ] Popover band hone par focus input par wapas
- [ ] (optional) axe check story/test mein

**Keyboard**
- [ ] Section 7 ki har key ka test (`userEvent.keyboard`)
- [ ] Month boundary cross karne par title badle
- [ ] Focus trap: Tab dialog ke bahar na jaaye
- [ ] Escape: grid se band, input se text revert

---

## 11. Story list (Storybook)

| Story | Kya dikhaye |
|-------|-------------|
| `Default` | uncontrolled, khaali |
| `Controlled` | value bahar state mein, neeche JSON mein live value (`"2026-03-15"` / `null`) dikhe |
| `Sizes` | sm / md / lg ek saath, saath mein same size ka Button |
| `States` | disabled, readOnly, invalid, loading, empty, with value |
| `InField` | `Field` ke saath label, hint, required, error |
| `MinMaxAndDisabled` | min/max + weekends disabled + holidays list |
| `LocaleAndFormat` | `en-US` + `MM/DD/YYYY` + Sunday start; `hi-IN` + `DD-MM-YYYY` + Monday start |
| `SmartTyping` | shortcuts ki list ke saath, parsed-date echo |
| `Customised` | component CSS variables + `classNames` + `data-*` se restyle (gol cells, alag selected color) |
| `InsideOverflowContainer` | `overflow: hidden` box/modal ke andar, popover cut na ho |
| `Dark` | `data-theme="dark"` |

---

## 12. Implementation order (tum khud likhoge)

Har step ke baad test + story chala ke dekho, phir agla.

| # | Step | Kya banega | Concept jo seekhoge |
|---|------|------------|---------------------|
| 1 | **`date-utils.ts` + tests** | ISO parse/format, `addDays`, `addMonths`, format parse (`DD/MM/YYYY`), month grid array. Abhi koi UI nahi | Pure functions, TDD, local vs UTC `Date` ka farak, edge cases (leap year, month clamp) |
| 2 | **Sirf input + value** | `DatePicker` = `.sl-control` wrapper + input; text state vs committed value; blur/Enter par parse; controlled/uncontrolled; `useFieldProps`; hidden input | Controlled vs uncontrolled pattern (`value ?? internal state`), `forwardRef`, "draft text vs committed value" |
| 3 | **Static calendar grid** | Ek alag internal `Calendar` component: title, weekday header (`Intl`), 6x7 days, `data-today`/`data-outside`, prev/next buttons | `Intl.DateTimeFormat`, table semantics, data-attributes se styling |
| 4 | **Selection** | Day click se `onChange`, `data-selected`, `aria-selected`, Today button | Lifting state up, derived state (selected/today compute karna, store nahi karna) |
| 5 | **Popover open/close** | Trigger button, native `popover`, positioning function, Escape/outside click, focus input par wapas, `open`/`onOpenChange` | Top layer, `useRef` + `getBoundingClientRect`, `useEffect` cleanup (scroll/resize listeners), focus management |
| 6 | **Keyboard + ARIA** | Roving tabindex, section 7 ki keys, focus trap, `aria-live` title | Roving tabindex, `onKeyDown` key map, WAI-ARIA dialog + grid pattern |
| 7 | **Constraints + polish** | min/max, `isDateDisabled`, clear, sizes, loading, `labels`, `classNames`, CSS variables, smart typing, saari stories, `index.ts` export, changeset | API design, CSS custom properties layering, i18n props, release flow |

**Kyun ye order:** sabse risky logic (dates) pehle bina UI ke test ho jaata hai; UI step-by-step bahar se andar banta hai (input, phir grid, phir popover), aur har step khud mein kaam karta hua cheez deta hai jise PR mein dikhaya ja sake. Step 1-2 ke baad hi DatePicker "typed date input" ki tarah usable hai.

**Kyun `Calendar` alag internal component:** aage range picker ya inline calendar (popover ke bina, dashboard mein) mein seedha reuse hoga, aur test bhi alag se ho jaayega.

---

## 13. Future (v0.2 ke baad)

- **Range picker** (`{ from, to }` ISO pair, do months side by side, hover preview). Isi liye `Calendar` component alag rakha hai.
- Month/year quick jump (title click par year grid), DOB jaise door ke saal ke liye.
- Presets ("Aaj", "Month end", "Next working day") jo app config se aayein.
- Date + time (`TimeInput` ke saath combined).
- Fiscal year / non-Gregorian calendars (`Intl` calendar option se).
- Server-driven disabled dates (`loadDisabledDates(month)` async, `loading` state already ready hai).
- Form-engine schema: `{ "type": "date", "min": "2026-01-01", "disabledRule": "weekends" }` jaisa JSON mapping.

---

## 14. Design sawaal (tumhe decide karna hai)

1. **Week kis din se shuru ho: Monday ya Sunday?** Spec abhi `weekStartsOn` default `1` (Monday) maanta hai, kyunki ISO standard aur bahut se business calendars Monday se chalte hain. Par agar tumhare users ka paper calendar/habit Sunday wala hai to default `0` rakhna better hai. Ya default `locale` se nikaalein (jahan browser support ho) aur fallback Monday?
2. **Invalid typed text blur par kya kare: wahi rahe (error ke saath) ya last valid value par revert ho?** Spec "wahi rahe" bolta hai taaki user apni galti dekh ke theek kare. Revert karne se form hamesha valid state mein rehta hai, par user ka type kiya text chupke se gayab ho jaata hai.
3. **Plain `ArrowDown` (bina Alt) input par calendar khole ya nahi?** Kholne se discoverability badhti hai, par data-entry forms mein kuch users `ArrowDown` se agle field par jaane ki aadat rakhte hain (aur form-engine mein aage "Enter = next field" jaisa feature aa sakta hai). Saath mein: DOB jaise use-case ke liye month/year dropdown v0.2 mein hi chahiye, ya smart typing kaafi hai?

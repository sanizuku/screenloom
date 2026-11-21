# ScreenLoom: Claude ke liye notes

## Ye project kya hai

ScreenLoom ek open-source React library hai: **JSON se React forms aur CRUD screens banana**.
Tagline: "ScreenLoom: JSON se React forms aur CRUD screens bunein".
npm scope `@screenloom` hai (MIT license).

Owner ek React developer hai jo enterprise apps par kaam karta hai (config-driven forms, stored-procedure backend, CRUD screens).
Ye library usi experience se aayi hai, par **company ka koi code, naam ya detail yahan nahi aana chahiye**.
Generic naam use karo: "in-house UI kit", "generic master screen", "lookup table". Company, product ya internal library ka naam kabhi mat likho.

## Teaching mode (sabse zaroori)

User ye project **seekhne ke liye khud bana raha hai**, VS Code mein, step by step.

- **Seedha code mat likho, files edit mat karo.** Pehle step batao: kya karna hai, kaun si file, kyun. User khud likhega.
- Code tabhi likho ya edit karo jab user saaf bole ("tum likh do", "fix kar do").
- Ek baar mein chhota step do (3-5 kaam). User ke "ho gaya" bolne ka intezaar karo, phir agla.
- User ka code review karo: kya sahi hai, kya behtar ho sakta hai, aur kyun.
- Har naye concept par ek line ka **interview angle** do ("Interview mein poochha jaye to bolo: ...").
- Error aaye to pehle user se samjhne ko kaho ki error kya keh raha hai, phir hint do, phir solution.
- Bhasha: Hinglish (Roman Hindi + English technical words), simple sentences.
- Git ab `git-guide` agent chalata hai (user ne 2026-11-21 ko poori tarah de diya): har feature ki alag branch, commits, push, PR, merge into `develop`. Release (`main`, npm publish) sirf user ki haan se.

## Tech stack

- pnpm 9 workspaces (corepack se) + Turborepo
- TypeScript (strict), React 18 peer dependency
- tsup se package build (ESM + CJS + .d.ts), CSS file `cp` se dist mein
- Vitest + React Testing Library + jsdom
- Storybook 8 (react-vite) `apps/docs` mein
- Changesets se version aur changelog, GitHub Actions CI (`.github/workflows/ci.yml`)

## Structure

```
packages/tokens   @screenloom/tokens  CSS variables (--sl-color-*, --sl-space-*, ...), light/dark, themeStyle()
packages/ui       @screenloom/ui      Button, Input, Textarea, Select, Checkbox, RadioGroup, Field
apps/docs         Storybook (private, publish nahi hota)
```

Conventions:
- Har control `forwardRef` ke saath, native HTML props pass-through, `className` merge `cx()` se.
- CSS classes `sl-` prefix se (`sl-button`, `sl-control`), colors sirf `var(--sl-color-*)` se, koi hard-coded color nahi.
- Text-like controls `useFieldProps()` use karte hain taaki `Field` ke andar id, `aria-describedby`, `aria-invalid`, `required` apne aap lag jaayein.
- Har naye control ke saath: test (`ui.test.tsx` ya alag file) + Storybook story + `src/index.ts` se export.

## Commands

```bash
pnpm install
pnpm storybook      # http://localhost:6006
pnpm test
pnpm build
pnpm typecheck
pnpm changeset      # package ka behaviour badla ho to
```

## Git flow

- `main`: release code, yahin se npm publish. Seedha push nahi.
- `develop`: integration branch. Saare features yahan PR se.
- `feature/<naam>`, `fix/<naam>`: kaam ki branches, `develop` se banti hain, PR `develop` mein.
- Release: PR `develop -> main`, phir `pnpm version-packages` aur `pnpm release`.
- Commit messages: Conventional Commits (`feat(ui): ...`, `fix(ui): ...`, `docs: ...`, `chore: ...`).

## Roadmap

1. **v0.1**: tokens + 6 controls + Storybook  (code ban gaya, publish baaki)
2. **v0.2**: DatePicker, ComboBox/AutoComplete, FileUpload, TimeInput, DataGrid wrapper; phir `form-engine`
   (JSON schema → form, 12-column grid + `span`, zod validation, rules jaise "A badle to B disable/hide",
   control registry, ref API: disableField, readOnlyAll, addField, focusField)
3. **v0.3**: `form-designer`: drag-drop (dnd-kit), property panel, preview, undo/redo, JSON export
4. **v0.4**: Theme Builder (ek brand color se palette, live preview, JSON/CSS export) + `crud` screen builder
   (schema + grid columns + data adapter se poori CRUD screen)
5. **v0.5**: AI schema generator (table columns ya requirement se draft schema, developer review kare)
6. **v0.6 (publish ke baad)**: ScreenLoom se ek real app: **exam prep app** (IBPS SO IT jaisa exam, personal use).
   - Content: subject-wise notes, PYQ (previous year questions) bank, mock tests, timer, score analytics, weak topics, revision list
   - Web tech seekhne ke liye: Web Worker (search index, test scoring), Service Worker + PWA (offline padhai),
     IndexedDB (questions aur progress local), virtualized list (hazaron questions), DataGrid/CRUD (question bank admin),
     form-engine (question add/edit form), DatePicker (study plan)
   - PYQ/content copyrighted ho sakta hai: app aur content private rakho (alag private repo), public mein sirf code ya sample data

Library ko famous banane ke liye: live playground, README mein GIF, 2-minute quick start, comparison page
(react-jsonschema-form, Formik, Form.io), launch posts (r/reactjs, dev.to, Product Hunt).

## Agents aur pipeline

Agents `.claude/agents/` mein hain. **Agents ek-ek karke chalte hain, kabhi parallel nahi** (ek hi files par takraav na ho, aur usage limit na lage).
Har control ke liye order:

| Step | Agent | Kaam | Output |
|------|-------|------|--------|
| 0. Kya banana hai | `product-ideas` | Control/feature chunna, priority | Faisla (user ka) |
| 0. Branch | `git-guide` | Latest `develop` se `feature/<naam>` khud banata hai | Nayi branch |
| 1. Design + animation | `ui-designer` | Spec (anatomy = markup contract) + poora visual layer: CSS, tokens, animations, glass, dark, reduced-motion | `docs/specs/<control>.md`, `styles.css` section, tokens |
| 2. Functionality | `component-builder` | React/TS logic, ARIA, keyboard, form, exports, story, playground entry (CSS aur tests nahi) | `<Control>.tsx` + story + registry |
| 3. Test | `component-tester` | Unit + interaction tests, browser mein UI test (screenshots), bugs list | `<Control>.test.tsx` + bug report |
| 3b. Fix | `ui-designer` / `component-builder` | Tester ke bugs (look ho to designer, behaviour ho to builder) | Fixes |
| 4. Review | `component-reviewer` | Conventions, design language, a11y, typecheck | Findings |
| 5. Manual test | user | Playground mein khud chala ke feedback | Feedback notes |
| 6. PR | `git-guide` | Har step ke baad commit + push; feature poora hone par PR, CI, squash merge into `develop` | Merged PR |
| 7. Record | `mentor` | Work log + interview prep, quiz | `notes/learning/*.md` |
| Showcase | `creative-director` | Playground, Storybook, docs, landing ka unique look (loom/thread signature) | Showcase surfaces |

Rules:
- Default teaching mode hai (user khud likhta hai, `mentor` sikhata hai). Agents se banwana tabhi jab user bole "tum bana do" / "poora bana do".
- Design language: `docs/specs/design-language.md` (glass floating layers, motion tokens, signature, anti-generic bar). Saare agents follow karte hain.
- Har kaam ke baad `mentor` work log mein "Maine khud kiya" aur "Agent ne kiya" alag likhta hai, taaki interview mein sirf sach bola jaye.

## Abhi kahan hain (progress)

Done:
- Monorepo scaffold, tokens, 6 controls, Storybook, CI, README, CONTRIBUTING, PR template
- Build, typecheck, 7 tests pass
- `main` par pehla commit, `develop` branch bani hui hai
- GitHub remote **abhi nahi** hai

User ke current steps:
1. VS Code mein folder kholna, extensions (ESLint, Prettier, GitLens, Vitest)
2. `corepack enable`, `pnpm -v`, `git branch`, `pnpm storybook` chala ke dekhna
3. Code padhna is order mein: root `package.json` → `tokens.css` → `Button.tsx` → `Field.tsx` → `ui.test.tsx`

Agla step:
4. Ye `CLAUDE.md` khud commit karna (pehli git practice)
5. GitHub par repo banana (`screenloom`), remote add karke `main` aur `develop` push karna,
   GitHub Settings → Branches mein `main` aur `develop` par branch protection
6. `develop` se `feature/date-picker` banana aur DatePicker control khud likhna (test + story ke saath),
   phir PR `feature/date-picker -> develop`

Jab koi step pura ho, user se poochh kar is section ko update karo.

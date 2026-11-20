# ScreenLoom

React forms aur CRUD screens JSON se banane ki library.

> Status: v0.1, early. Abhi controls aur design tokens hain. Form engine, drag-drop designer, Theme Builder aur CRUD screen builder aage aayenge.

## Packages

| Package | Kya hai |
| --- | --- |
| [`@screenloom/tokens`](packages/tokens) | Colors, spacing, radius, fonts. Light aur dark CSS variables |
| [`@screenloom/ui`](packages/ui) | Button, Input, Textarea, Select, Checkbox, RadioGroup, Field |
| [`apps/docs`](apps/docs) | Storybook: har control ka live demo (private, publish nahi hota) |

## Quick start

```bash
npm i @screenloom/ui @screenloom/tokens
```

```tsx
import "@screenloom/tokens/tokens.css";
import "@screenloom/ui/styles.css";
import { Field, Input, Button } from "@screenloom/ui";

<Field label="Name" error={errors.name} required>
  <Input name="name" />
</Field>
<Button type="submit">Save</Button>
```

`Field` label, hint aur error ko control se apne aap jodta hai (`htmlFor`, `aria-describedby`, `aria-invalid`).

## Development

Node 20+ chahiye. pnpm corepack se aata hai:

```bash
corepack enable        # ek baar
pnpm install
pnpm storybook         # http://localhost:6006
pnpm test
pnpm build
```

## Roadmap

1. **v0.1**: tokens + 6 controls + Storybook
2. **v0.2**: baaki controls (DatePicker, ComboBox, FileUpload, DataGrid wrapper), `form-engine`
3. **v0.3**: `form-designer` (drag-drop)
4. **v0.4**: Theme Builder, `crud` screen builder
5. **v0.5**: AI schema generator

## Contributing

Branches aur PR ka tareeka [CONTRIBUTING.md](CONTRIBUTING.md) mein hai.

## License

MIT

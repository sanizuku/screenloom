# Contributing

## Branches

| Branch | Kaam | Kaun merge karta hai |
| --- | --- | --- |
| `main` | Release wala code. Yahin se npm publish hota hai | Sirf `develop` se release PR |
| `develop` | Agle release ka code, saare features yahan milte hain | `feature/*` aur `fix/*` se PR |
| `feature/<naam>` | Ek feature, jaise `feature/date-picker` | Aap |
| `fix/<naam>` | Bug fix, jaise `fix/select-placeholder` | Aap |

`main` aur `develop` par seedha push nahi. Hamesha PR.

## Roz ka flow

```bash
git checkout develop && git pull
git checkout -b feature/date-picker
# kaam karo, chhote commits
pnpm test && pnpm build
pnpm changeset          # agar package ka behaviour badla
git push -u origin feature/date-picker
# GitHub par PR: feature/date-picker -> develop
```

Release ke time: PR `develop -> main`, merge ke baad `pnpm version-packages` aur `pnpm release`.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

- `feat(ui): add DatePicker`
- `fix(ui): Select placeholder not shown`
- `docs: update README`
- `chore: bump deps`

## PR checklist

- [ ] `pnpm test` aur `pnpm build` pass
- [ ] Naye control ki Storybook story
- [ ] Naye behaviour ka test
- [ ] Changeset add kiya (agar package badla)

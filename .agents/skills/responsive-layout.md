# skill: responsive layout

## Breakpoints

| Zone | Tailwind | Nav |
|------|----------|-----|
| compact | default, `<sm` | Bottom tab bar + More sheet |
| comfortable | `sm`–`lg` | 56px icon rail |
| spacious | `lg+` | 240px labeled sidebar |

Tokens: `--nav-height-compact` in `src/styles.css`.

## Shell

- `src/components/layout/app-shell.tsx` — orchestrates sidebars + bottom nav
- `nav-config.ts` — `BOTTOM_NAV`, `MORE_NAV`, `NAV_GROUPS`
- Main content padding: `px-4 py-6` → `sm:px-6 sm:py-8` → `lg:px-8 lg:py-10`

## Checklist (Playwright / manual)

Viewports: 390×844, 768×1024, 1280×800.

- [ ] Login form usable without horizontal scroll
- [ ] Bottom nav visible only on compact; no overlap with content
- [ ] PageHeader actions stack full-width on compact
- [ ] Tables: use card list (`sm:hidden` / `hidden sm:block`) where needed

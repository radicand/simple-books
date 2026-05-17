---
name: ui-components
description: Maps UI needs to simple-books primitives in src/components/ui and related layout components. Use when building pages, forms, tables, badges, or styling new features.
---

# UI components

All primitives live in `src/components/ui/index.tsx`. No external UI library.

## When to reach for what

| Need                                     | Use                                |
| ---------------------------------------- | ---------------------------------- |
| Page title + subtitle + actions          | `<PageHeader>` (stacks on compact) |
| Mobile list instead of wide table        | Card rows with `md:hidden` / `hidden md:block` |
| Side-by-side fields on compact           | `<FormGrid>` from `~/components/form-grid` |
| Form submit row on compact               | `<FormActions>` from `~/components/form-actions` |
| Invoice line editor                      | `<InvoiceLineEditor>` from `~/components/invoice-line-editor` |
| Bordered container with header           | `<Card>` + `<CardHeader>` + `<CardBody>` |
| Form input                               | `<Input>`, wrapped in `<Field>`    |
| Multi-line text                          | `<Textarea>` inside `<Field>`      |
| Picker                                   | `<Select>` (styled native)         |
| Currency in a cell                       | `<Money cents={…} tone="…" />`     |
| Status pill                              | `<Badge tone="positive|negative|warning|info|brand|neutral">` |
| Table                                    | `<Table>` + `<THead>` + `<Th>` + `<Tr>` + `<Td>` |
| Empty state                              | `<EmptyState title hint action>`   |
| Inline SVG icon                          | `<Icon d="..." size={…} />`        |
| Modal                                    | `<ModalDialog title onClose>` (exported from `routes/_app/services.tsx`) |

## Tone rules

- Numbers: always `Money` or a `tabular`-classed span.
- Status: always `Badge`, never inline color text.
- Headings: `PageHeader` for the top; `<h3>` 14–15px for card titles.
- Body: 13–14px default, ink-soft (`text-[var(--color-ink-soft)]`) for prose.
- Color: brand for primary action; restrained accents. Use `--color-ink*` tokens.
- Density: generous whitespace; calm, not packed.

## Layout convention

- Each `_app/...` route renders inside `<main>` capped at 1200px wide.
- Page = `<PageHeader />` then content blocks (cards, tables).
- Forms: labels above inputs; submits in a right-aligned footer.

Breakpoints and shell: [responsive-layout](../responsive-layout/SKILL.md).

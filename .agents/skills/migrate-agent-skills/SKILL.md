---
name: migrate-agent-skills
description: Converts flat .agents/skills/*.md notes into Agent Skills-standard skill-name/SKILL.md directories. Use when adding skills, migrating legacy markdown skills, or restructuring .agents/skills/.
---

# Migrate agent skills

Follow [agentskills.io/specification](https://agentskills.io/specification). No root `index.md` — discovery is via each skill's `name` + `description` frontmatter.

## Workflow

1. **Inventory** flat `.md` files in `.agents/skills/`
2. **Create directory** — folder name = `name` field (lowercase, hyphens, max 64 chars)
3. **Write `SKILL.md`** with required frontmatter:
   - `name`: matches directory
   - `description`: third person, WHAT + WHEN + trigger keywords
4. **Trim body** — drop `# skill: …` titles; keep recipes, tables, code; don't duplicate `AGENTS.md` invariants
5. **Progressive disclosure** — time-sensitive or rarely needed sections → `references/` (link one level deep)
6. **Update** `AGENTS.md` skill list (repo-level catalog only)
7. **Delete** replaced flat `.md` files (including any legacy `index.md`)
8. **Optional**: `skills-ref validate ./skill-name`

## Adding a new skill

```bash
mkdir -p .agents/skills/my-skill
```

Create `.agents/skills/my-skill/SKILL.md`:

```yaml
---
name: my-skill
description: What it does and when to use it (third person, trigger keywords).
---

## Instructions
...
```

Add a one-line entry to `AGENTS.md` under Skills.

## Layout

```
.agents/skills/
└── my-skill/
    ├── SKILL.md          # required
    ├── references/       # optional, on-demand docs
    └── scripts/          # optional, executable helpers
```

Keep `SKILL.md` under 500 lines. Split detail into `references/` when a section is long or time-sensitive.

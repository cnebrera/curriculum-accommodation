# Contract — vault format

The contract between the application and the teacher's files. **Breaking it
breaks her editor, her Obsidian, and her backup**, so it changes only with a
migration.

## Guarantees to the teacher

1. Every file is UTF-8 markdown or YAML, readable without this application.
2. Structure is prose-first: light front matter, meaningful body.
3. The app never rewrites a file she has not acted on.
4. Hand-edits are repaired and reported, never rejected, and her words are never
   lost.
5. Only `.rampa/` is machine-owned. Everything else is hers.
6. Uninstalling leaves the vault complete.

## Front matter

Minimal, and every key optional except where stated. Unknown keys are preserved
verbatim — the app is a guest in these files.

```yaml
---
code: A3              # required in profile.yaml
axes:
  DEC: 2
  LIN: 2
  COG: 3              # 0-3, or omitted. Never write 0 to mean "unknown"
axes_confirmed:
  COG: 2026-09-04
---
```

## Repair rules

| Input | Behaviour |
|---|---|
| Invalid YAML | Whole file becomes body; front matter synthesised; repair reported |
| Unknown key | Preserved, untouched |
| Axis out of range | Kept in `_unparsed`, teacher asked |
| Missing axis | Stays missing. **Never defaulted to 0** |
| Duplicated file for one learner | Both kept, teacher asked. Never merged automatically |

## Filenames

Generated from a code and a slug, ASCII, no spaces. **Never derived from content**
(`007` FR-508). A teacher may rename freely; the app follows by front matter, not
by path.

# Evaluation cases

A case is how we tell whether a change to a recipe improved the output or
degraded it. As the recipe corpus grows this becomes the most important
safeguard in the project: without it, every contribution is a guess.

A case is a directory containing:

```
cases/<name>/
├─ source/          openly licensed or invented material — NEVER a textbook page
├─ profile.yaml     which type-profile from profiles.example/ applies
├─ expected.md      the adaptation we expect, or the properties it must have
└─ notes.md         what this case is testing and why it is hard
```

Cases assert **properties**, not exact strings. "Exercise numbering is preserved",
"the term *autótrofo* still appears", "no block lacks `data-recipe`" are testable.
Byte-identical output is not, and demanding it would make every recipe
improvement look like a regression.

Empty for now. The first case should come from Phase 0 validation — the real
worksheet a teacher tries, reduced to something we are allowed to redistribute.

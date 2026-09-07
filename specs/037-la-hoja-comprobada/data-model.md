# Phase 1 · Data model

Nothing is stored and nothing changes shape. The model is written down because two
requirements are about it.

## A heading block, as the IR carries it

```
::: {#p1-b1 .explanation data-page="1" data-source-id="b1" data-heading="true"}
Los ecosistemas
:::
```

| Field | Meaning | Written by |
|---|---|---|
| `data-heading` | «the extraction classified this block as a heading» | `ingest/to-ir.ts` |
| **no level** | there is none, and that is R1's whole finding | — |
| `data-page`, `data-source-id` | where on the paper it came from (Principle VI) | `ingest/to-ir.ts` |
| the class | `explanation` — the heading flag is **orthogonal** to the block class | the extraction |

**The class stays what it was.** A heading is not a fifth block class: it is a property of
a block that also has a class, which is why the flag is an attribute. So the rendered
element keeps `class="explanation"` and gains a heading inside — and nothing downstream
that filters by class changes behaviour.

## What the rendered block becomes

Today:

```html
<section id="p1-b1" class="explanation" data-page="1" data-heading="true"><p>Los ecosistemas</p></section>
```

After:

```html
<section id="p1-b1" class="explanation" data-page="1" data-heading="true"><h2>Los ecosistemas</h2></section>
```

**The section survives with every attribute** (Principle VI): the id, the class and the
whole `data-*` set carry the recipe and the axis that justify each change, and a heading
that lost them would be a change that cannot state why it was made.

## The three presentations checked

| | What differs | What does not |
|---|---|---|
| draft | the draft banner is present | the structure |
| signed | the banner is gone (`007` FR-509) | the structure |
| largest text | `--font-size`, `--measure`, `--line-height` | the structure |

They are **one document rendered three ways**, which is why checking three is worth doing
and checking thirty is not: the knobs are numbers inside the same markup, and the banner is
the only structural difference among them.

# Contract — the page shell

For whoever writes the next screen. **A screen declares what it is. The shell
decides where things go.**

## What a screen may decide

- Its title and its one-line lede.
- Its sections, and what is in them.
- Which single control is the primary action, if it has one.
- Whether it needs the wide variant (two-column comparison work).

## What a screen may not decide

- **A max width.** The shell owns the measure. A field is a field's width
  everywhere, and a 1000 px input is not a design decision.
- **A gap.** Three levels exist — between sections, between fields, within a
  field — and they come from the scale. A screen choosing `gap4` by eye is how the
  rhythm was lost.
- **A spinner, an error box or an empty state.** Those come from the data layer and
  read identically everywhere, because a teacher meeting a different-looking error
  on each screen learns that the application is unpredictable.
- **A second primary button.** Emphasis that is everywhere is emphasis nowhere.

## Using it

```tsx
<Page title="Mis alumnos" lede="Los nombres solo los ves tú.">
  <Section>
    <Field label="¿En qué curso está?">…</Field>
  </Section>
  <Actions primary={<button className="btn btn-primary">Guardar</button>} />
</Page>
```

## If the shell does not fit

**Fix the shell.** A screen that escapes it is a fact about the shell, and working
around it once is how the shell stops being worth having by the fourth screen.

Two variants exist because two screens genuinely need them, and both are shell
variants rather than exceptions:

- **`wide`** — the verification screen, where a page image sits beside its
  extracted blocks and the comparison *is* the feature.
- **`canvas`** — the adapt screen's paste box, which is a surface she fills rather
  than a field she completes.

## The one rule that is not about layout

**The draft mark stays the loudest thing on the review screen.** A calmer page is
the point of this work, and the drift it invites is calming the one element whose
job is to be unmissable until she signs. It is Principle VII, and it survives
recomposition or the recomposition is wrong.

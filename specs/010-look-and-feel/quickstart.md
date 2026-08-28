# Quickstart — validating the feature

## Prerequisites

Node 22 LTS. No API key for anything here: the interface does not need a model.

## 1 · The contrast claim is arithmetic

```bash
cd app && npm ci
vitest run packages/core/test/contrast.test.ts
```

**Expected**: every text pairing the tokens declare is ≥4.5:1 and every non-text
indicator ≥3:1, in **light, dark, high-contrast light and high-contrast dark**.
The failure message names the pairing and its ratio, because "contrast failed" is
not actionable.

This is the gate that means a hex value edited in six months cannot quietly drop
below the floor.

## 2 · Every screen passes axe

```bash
npm run test:e2e -- a11y
```

**Expected**: zero violations on every screen, in both themes, at default and
largest text size. Covers what arithmetic cannot: labels, heading order, error
associations, focus order, live regions.

## 3 · It survives the machine she actually has

```bash
npm run test:e2e -- layout
```

**Expected**: at **1366×768**, every screen complete, no horizontal scroll, no
clipped control. Then the compounding case — largest text preference at 200%
browser zoom — with nothing lost or overlapped. That combination is where layouts
break, so it is asserted rather than hoped.

## 4 · Keyboard only, all the way through

Not automated, and it takes four minutes.

Unplug the mouse. Complete the whole first run: vault, connect, first learner,
paste a worksheet, verify, adapt, review, sign, print. **Expected**: every step
reachable, the focus ring visible at every stop, and focus never lost after a
state change.

If you reach for the mouse, that is the defect — write down where.

## 5 · No placeholders left

```bash
grep -rn "<pre" app/ui/src
```

**Expected**: nothing in a screen. The `<pre>` dumps standing in for the report,
the checklist and the notes index are what FR-826 and US1-2 are about; a hit here
means a screen still has a raw view in it.

## 6 · The two questions that decide it

Asked of the teacher during the Phase 0 session, in her words, and the answers
written down verbatim:

- **"¿Esto te parece una herramienta seria?"** (SC-805) — open question, asked
  once, early. Record the answer even when it is unflattering, especially then.
- **"¿Sabrías hacer la letra más grande?"** (SC-806) — do not point at anything.
  If she cannot find the preferences, they are in the wrong place.

And one observation rather than a question: **show her an unsigned worksheet and
see whether she says it is not reviewed** (SC-807). If she does not notice the
mark unprompted, the mark is too calm and this feature has the balance wrong.

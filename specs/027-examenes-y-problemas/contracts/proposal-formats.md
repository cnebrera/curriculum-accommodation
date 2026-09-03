# Contract · the three wire formats, and the guarantee they share

The wire format is mechanics and lives in code (the boundary `OUTPUT_FORMAT`'s own
comment records); this contract is what each path may rely on and what every parser
promises. The judgement about what makes the content *good* is corpus
(`instructions/compose.md`), not here.

## The shared guarantee: parse or drop, never guess

Every parser — `parseProposals`, `parseProblemProposals`, `parseExamProposals` —
tolerates exactly the punctuation that would waste her money on a retry (a code fence,
list numbering, a trailing full stop) and **nothing else**. A block or line the parser
half-understands becomes *no proposal*. A guessed proposal goes to the verifier, which
then checks the guess rather than what the model said — the one failure this layer
exists to prevent.

## 1 · Skill practice (the existing one-liner, now the skill path's own)

```
47 × 8 = 376
```

One line per exercise, `expresión = resultado`, nothing around it. Unchanged — and
**appended only to the skill path's system**. The content path stops receiving it
(the AGE-04 contradiction dies), and the new paths never see it (FR-2507).

## 2 · Problems

```
PROBLEMA
ENUNCIADO: María tiene 3,50 € y compra un cuaderno que cuesta 1,20 €. ¿Cuánto le queda?
OPERACIÓN: 3,50 - 1,20
RESULTADO: 2,30
```

- `ENUNCIADO` runs until the next label; it is the text the child will read, verbatim.
- `OPERACIÓN` must parse under the arithmetic grammar (`EXPR`), and **every operand must
  appear, as a value, among the numbers extracted from `ENUNCIADO`** — Spanish decimal
  comma folded, `3,50 ≡ 3.50`.
- `RESULTADO` is compared against the computed answer, never used.
- A block may omit `OPERACIÓN`/`RESULTADO` (a non-computable ask): it is then a
  candidate for the declared-unverified path, never for the key's computed entries.
- The computed answer must not appear in `ENUNCIADO`: an answer in the statement is an
  answer on the learner's page.

## 3 · Exam questions

```
PREGUNTA
TEXTO: Calcula: 305 − 148
OPERACIÓN: 305 - 148
RESULTADO: 157

PREGUNTA
TEXTO: Escribe una oración con la palabra «península».
RESULTADO: (respuesta orientativa para la clave)
```

- `TEXTO` is the learner-facing prompt. It reaches the sheet; nothing else in the block
  ever does.
- With `OPERACIÓN`: verified exactly as a problem (operands in `TEXTO`, computed answer,
  level, constraints).
- Without: the question is carried **declared-unverified**; its `RESULTADO`, if any,
  may reach only the key, as a per-entry-labelled draft (research R3), never the sheet.

## 4 · Content / study (unchanged)

IR blocks with `data-objective` and `data-anchor`, per `composeContent`'s
`CONTENT_FORMAT` — now sent with a system that does not simultaneously demand
one-liners.

## What every caller may rely on

| Promise | Held by |
|---|---|
| No learner-facing text contains an answer, computed or claimed | the parsers strip nothing — `buildSheet` writes only `statement`/`text`, and the rendered-output test asserts the absence (SC-2502) |
| Every computed answer traces to quantities in the statement the child reads | `verifyProblem` (FR-2501) |
| A proposal inconsistent with its own arithmetic is rejected, not repaired | `verify` reuse — reject-don't-repair (FR-2502, `002`) |
| A batch that is 100% `unknown` stops the loop and names the constraint | the loop cut (FR-2510) |

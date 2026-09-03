# Quickstart — proving the normativa is a corpus, not an accent

Ordered so everything checkable offline is checked before anything spends money, and so
the two invariant greps exist **before** the extraction they police.

## Prerequisites

```bash
cd app
npm ci
npm test          # typecheck + the whole offline suite
```

A vault with one learner and recorded work (so an ACNS can be drafted), and no corpus
selected — the state every teacher outside Andalucía is in on day one.

---

## §1 · The two tests to write first

```bash
npx vitest run packages/core/test/no-territory-outside-corpus.test.ts
npx vitest run packages/core/test/andalucia-unchanged.test.ts
```

**The grep (SC-2701/SC-2702), red today.** A named artefact list — Séneca, 8-3-2017,
Instrucciones de 8 de marzo, DIAC, ACNS, ACS, Andalucía… — greps to **zero** in:
`instructions/*.md` outside `instructions/normative/`; `app/packages/*/src` and
`app/ui/src`; and every generic-mode rendering the suite produces. Allowlist:
`instructions/normative/`, `docs/normativa-andalucia.md`, `specs/`. It must be red at
all the sites research R5 names — including the four TypeScript ones — before anything
moves, because written after the refactor it would be written to fit it.

**The golden Andalusian draft.** Drafted from a fixture record with *today's* code and
snapshotted. After the extraction, the same draft with `es-an` selected must be
identical. «Nothing changes for a teacher in Sevilla» as bytes, not as a promise.

## §2 · Offline · the contract and the resolver

```bash
npx vitest run packages/core/test/normative.test.ts
```

| Case | Expected |
|---|---|
| `es-an.md` parses | id, label, register, two document types, phrases, review status |
| Malformed document type | dropped, logged, rest of the corpus loads |
| No corpus selected | `generic`, `because: 'nothing-selected'`, provenance line = the generic statement + orientador pointer |
| Configured `es-an` | `corpus`, `via: 'configuracion'`, `origin: 'bundled'` |
| Learner override to a second corpus | the learner's wins, `via: 'learner'` |
| Learner override `none` | generic, forced, even with a corpus configured |
| Selected corpus missing | generic **with the notice** — never another corpus |
| Vault corpus, hash matches activation | `origin: 'subido'` |
| Vault corpus, hash differs | `origin: 'modificado'`, and the provenance line says so |
| Unreviewed or modified corpus | provenance line can never read as reviewed |

Plus the structural one, FR-2709's shape: **no parsed field reaches any guard** — a
source-level assertion that `checkDeclines`, the clinical base list, the output checks
and the draft-mark path take no corpus input.

## §3 · Offline · generic mode is honest

Draft the generic adaptation document with nothing selected: no named platform, law,
document type or territorial procedure anywhere in it (SC-2702, the §1 grep over the
output); the generic statement and the orientador pointer present; the sections are the
generic scaffold, not the ACNS's list with the labels sanded off.

## §4 · Offline · the import scan

```bash
npx vitest run packages/core/test/normative-scan.test.ts
```

Over the `007` fixture corpus reshaped as corpus files, plus the new section-spoofing
fixtures (P18): a heading imitating «## Correcciones de la maestra», a role prefix, a
capability ask naming the draft mark, and a phrase authorising an easier exam. Each is
found, quoted and located; a clean file passes; nothing is ever rewritten.

## §5 · With a window · she selects, she imports

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/normative.spec.ts
```

1. Configuración → Normativa: the corpora listed, none pre-selected, generic named as
   what she has now. Select Andalucía; draft; the document prints «siguiendo el corpus
   normativo: Andalucía (incluido, sin revisar)».
2. Two vaults, two territories, one identical request: each draft cites its own corpus
   and register and nothing of the other's (US1's independent test).
3. Import a corpus file: **the full content is shown first**, activation is a separate
   press. Import the hostile fixture: findings shown quoted, activation refused by
   default, override is an explicit act — and it lands in the activation log (SC-2704).
4. Edit an imported corpus on disk; next draft prints «modificado por ti».
5. Delete the selected corpus: the next draft is generic, with the notice, and no other
   corpus was selected for her (FR-2711). Documents drafted earlier are byte-identical
   to before (FR-2710).
6. A learner with `normative_corpus: none` gets generic documents while the vault stays
   on Andalucía.

## §6 · The one that must never move

With the hostile corpus *activated* (override recorded): ask for the objectives to
remove — the decline is the same sentence; run the exam guards, the clinical filter and
the output checks — identical results to no corpus at all. **Hard rules outrank every
corpus** (FR-2709), and this is where it is a test rather than a sentence.

## §7 · Looked at, not asserted

```bash
npm run shots
```

Open them. The Normativa pane at the narrowest width and at `xlarge`; the import screen
with findings — whether «no lo actives» reads as clearly as it needs to; and the
provenance line on a printed draft — whether it is legible without shouting, because it
will be on every official document she produces.

## §8 · The verdict I cannot produce (SC-2705)

Give a PT from a second territory the import flow, the contract document and her
territory's rules — and nothing else. If she cannot produce a working corpus without
touching code, the layer is not generic; it is Andalusian with a file picker. «Where she
got stuck» is worth more than the answer.

# Phase 0 · Research

Five questions. R1 fixes the shape of the contract; R3 is the one that keeps this from
being «Andalucía con los nombres borrados»; R5 found four Principle I violations the
feature must carry out with it.

---

## R1 · What exactly is a normative corpus file, and what may it never contain?

**Decision**: one Markdown file per corpus under `instructions/normative/`, front matter
plus prose, mirroring `011`'s education contract (`specs/011-quien-alumno-edad/contracts/education-model.md`)
— same review pattern, same repair-not-reject parsing, same «unknown fields are
preserved». The exact contract is [contracts/normative-corpus.md](contracts/normative-corpus.md);
the fields, in one line each:

| Field | What |
|---|---|
| `id`, `label` | Stable id (`es-an`), and the name she reads («Andalucía») |
| `territory` | Free text naming where it applies — informative, never the selection key |
| `last_checked`, `reviewed_by_teacher` | The education-file pattern, verbatim, extended with `reviewed_by` / `reviewed_on` where known (FR-2706) |
| `register` | The platform of record («Séneca»), used in printed phrases |
| `documents:` | The document types this territory names (ACNS/ACS today), each with label, whether it touches objectives, who authors/coordinates it, prerequisites, and its `sections:` — the `acns_sections` shape of today's `guide.md` (`id`/`label`/`sourceable`/`from`), generalised |
| `phrases:` | The printed normative sentences — the «Esto no está presentado. El registro es X» line, the authorship footer, the «lo pones tú en X» name line |
| `clinical_terms_extra:` | Territory-specific additions to `guide.md`'s clinical list — the comment in `guide.md` already admits «un DIAC de otra comunidad usará palabras que aquí no están» |

**What the contract deliberately cannot say** — and this is FR-2709 as structure rather
than as a scan: **no field in the contract maps to any guard.** There is no field that
names a recipe, relaxes an exam rule, touches the draft mark, alters redaction, or edits
the decline. The parser consumes the declared fields and the prose travels as reading
material; a corpus «authorising» something has no slot to authorise it through. The
guards that would have to move are all deterministic code (`checkDeclines`, the clinical
filter, the output checks, `isSignedOff`) and none of them takes the corpus as input.

**Rationale**: the education contract has survived contact with a second consumer
(`002` FR-122's skills) without a code change, which is the property this layer needs —
a PT in Galicia adds a file, not a release (SC-2705). And mirroring it means the README,
the review discipline and the parsing posture are already written and already tested in
this repository.

**Alternatives considered**: a YAML-only schema with no prose — rejected: the prose *is*
the judgement layer (the «Nunca» lists, the two-documents explanation), and Principle I
says the text sent is the text she can edit. A directory per territory with several
files — rejected for v1: one file is what a teacher can write, carry and share; «or a
small set» stays open in the contract for a territory that genuinely needs it, but the
first three corpora must not need it.

---

## R2 · Where does the selection live, and how does the learner override win?

**Decision**: the same precedence chain as `024` FR-2215, in the same order, resolved in
one place:

```
resolveNormative(profile, selection, corpora)
  → the learner's own corpus     when profile.normative_corpus names one that exists
  → generic, forced              when profile.normative_corpus is 'none'
  → the configured corpus        when selection.selected names one that exists
  → generic, with a notice       when the selected corpus is missing (FR-2711)
  → generic                      when nothing is selected
```

**Where each fact lives:**

- **Configuración-level selection**: `normative/selection.md` in the **vault**, front
  matter only — the selected corpus id plus the activation log (R4). In the vault and
  not in application settings because it is professional context, not a machine fact:
  `vault-settings.ts` holds absolute paths and personal licence acceptances precisely
  because they must *not* travel; which normativa her school works under is the opposite
  kind of fact, and a vault restored onto a new laptop must keep it. Same reasoning that
  put her pictogram vocabulary in the vault (`024`, `core/src/pictograms/vocabulary.ts`).
- **Per-learner override**: one optional field on `profile.yaml`, `normative_corpus`,
  parsed in `vault/schema.ts` beside the pictogram `overrides` that established the
  per-learner-exception pattern (`018` FR-1612). It names a corpus id — or `none`, for
  the learner schooled across territories whose documents must stay generic.
- **Imported corpora**: files in `normative/` in the vault, same contract as bundled.

**Selection is by corpus id, not by territory string** (spec edge case): two files may
both say «Madrid»; she picks a file, and the id is what the selection and the override
record. Ids are namespaced like education ids so a bundled `es-an` and an imported
`madrid-claudia` cannot collide by accident.

**Alternatives considered**: selection in application `settings.json` — rejected, above.
Selection per learner only, no vault level — rejected: it is `018`'s mistake replayed
(«her school uses a different picture for *recreo*» was a fact about the school, not the
child), and she would select Andalucía once per learner for a caseload that shares one
territory. Territory string matching — rejected by the spec's own edge case.

---

## R3 · How is generic mode «written as its own product» rather than Andalucía blanked?

**Decision**: **generic mode is the rewritten `instructions/guide.md` and
`instructions/acs.md` themselves** — the base layer that is always sent — and a selected
corpus is an *addition* on top, never a substitution of the base. Generic is the absence
of a corpus, not a corpus file.

Concretely, the rewritten `guide.md`/`acs.md`:

- speak of «el documento de adaptación vigente en tu territorio» and «tu plataforma de
  registro» — roles, not names;
- keep everything that was never Andalusian: the clinical-terms base list, the
  measures logic, the ACS decline and `proposal_phrases` (refusing to decide objectives
  is Principle III, not a comunidad's rule), every «Nunca» list;
- gain the generic draft scaffold: a generic document label («documento de adaptación —
  borrador genérico»), the minimal sections Rampa can actually source from the record
  (the `full`/`partial` half of today's list, with generic labels), and the honest
  sentence FR-2703 requires — that territory-specific procedure is hers and her
  orientador's to verify — as front matter the drafts print.

**Why generic must not be a corpus file**: three requirements break if it is. FR-2711
says deleting the selected corpus falls back to generic — if generic were a file, it too
could be deleted, edited hostile, or shadowed by an import claiming its id, and «fall
back» would need a fallback. FR-2703's invariant (zero territory names) is testable over
a fixed base but not over a swappable file. And the base layer is what carries the
universal hard-line prose; making it selectable would make Principle III's refusal
selectable.

**Why this is not Andalucía with names blanked**: the generic draft does not imitate the
ACNS's seven sections with the labels sanded off. It has its *own* section list — only
what Rampa can source — because a generic document pretending to a territorial
document's completeness is exactly the «looks filed» failure `017` guards against,
without even a real regulation behind it. What differs is stated, not disguised.

**Alternatives considered**: `generic.md` as a bundled corpus selected by default —
rejected, above. Keeping `guide.md` Andalusian and subtracting when no corpus is
selected — rejected: subtraction in code is adaptation policy in TypeScript, and the
text sent would no longer be the text in the file (Principle I, the 1.3.0 sentence).

---

## R4 · What does the import scan check, and how is the override recorded?

**Decision**: a deterministic `scanNormativeImport` in `packages/core`, offline, over
the raw file — three families of shapes, all shown, none repaired:

1. **`007`'s injection tiers**, reusing `detectInjection`
   (`app/packages/core/src/ir/injection.ts`) over the whole content: tier A
   (addressee + directive, role imitation) and tier B (capability asks — print the
   profile, clear the draft mark, disable redaction, write outside the vault, send
   content elsewhere). A corpus is a worse vector than a worksheet — it enters prompts
   as *policy* — so the same shapes matter more here, not less.
2. **Section-spoofing shapes, per P18** (review AGE-02): headings or lines imitating
   the prompt's own section markers — «## Correcciones de la maestra…», «## Perfil»,
   «## Reglas», role prefixes — plus anything imitating the fence/nonce delimiters P18
   introduces. New patterns, added beside `detectInjection` so the adapt pipeline gains
   them too rather than a second copy drifting.
3. **Hard-rule-contradicting shapes**: text that purports to authorise what
   `hard-rules.md` forbids (lowering exam difficulty, printing a learner's name,
   removing the draft mark). Found → the conflict is *reported* at import (FR-2709's
   second half); the content is inert regardless, per R1's no-slot design.

**Refuse, don't repair** (`007`'s posture, FR-508's shape): findings are shown quoted
and located, activation defaults to refused, and nothing is ever silently removed from
her file — deletion hides an attack and loses legitimate content (007 FR-504). The
non-blocking rule of `007` FR-514 deliberately does **not** apply here: a worksheet
notice must not block a job she is paying for, but activating a policy file is exactly
the moment to block, and a false positive costs her one explicit override, not a job.

**The override is recorded** in `normative/selection.md`'s activation log: one entry per
activation — corpus id, date, a content hash of what was activated, the findings that
were shown, and whether she overrode them. The hash is also what derives «modificado por
ti» (R5) and what makes SC-2704 checkable: an activation of a corpus with findings and
no override entry is a test failure.

**How the semi-trusted corpus enters the prompt**: inside P18's fence-with-nonce, with
the task reminder after it — the same hardening the review agreed for material, applied
to the second untrusted surface it fits. Bundled corpora travel like `guide.md` does
today; imported and modified ones are fenced.

**Alternatives considered**: sanitising the file on import — rejected, refuse-don't-
repair, and a sanitised policy file is a policy she did not write. Scanning only front
matter — rejected: the prose travels to the model too. A model-based review of the
corpus — rejected: Principle II, the scan must be free and offline.

---

## R5 · Where does «origin» come from — and what did the grep for Séneca actually find?

**Decision on origin**: **derived, never stored in the file.** `bundled` = the file was
read from the application bundle (`readBundledDir('instructions', 'normative')`);
`subido` = read from the vault's `normative/`; `modificado` = a vault file whose current
content hash no longer matches the hash recorded at activation. A `origin:` front-matter
field would be a stored copy of what the filesystem already says — the two-copies defect
`014` and `021` R1 both established — and it would lie the moment a file is copied.

**The finding**: the grep behind SC-2701 does not only hit `instructions/`. Four
normative sentences are **hardcoded in TypeScript today**, all printing «Séneca» into
documents or the interface:

| Where | What |
|---|---|
| `app/packages/core/src/guide/acns.ts` | The draft header («El registro es **Séneca**», «La ACNS la coordina el tutor…»), the document title «(ACNS)», and «lo pones tú en Séneca» |
| `app/packages/core/src/report/index.ts` | «El registro es **Séneca**…» in the adaptation report |
| `app/packages/shell/src/jobs/guide.ts` | `ACS_FOOTER` — Séneca plus the three authorship roles |
| `app/ui/src/learners/LearnerSections.tsx` | «el registro es Séneca…» in interface copy |

Each is a normative phrase telling the teacher how her territory works, in code — a
latent Principle I violation that predates this feature and that FR-2704's «no
territory-specific content outside corpus files» flushes out. They move to the corpus
`phrases:` (or, for the generic sentence, to the rewritten `guide.md`), and the grep
test covers `app/` source as well as `instructions/` so they cannot creep back.

**What stays where it is**: `docs/normativa-andalucia.md` (a research document, not
sent to any model), `specs/` history, and `instructions/normative/es-an.md` itself —
the test's allowlist is exactly those.

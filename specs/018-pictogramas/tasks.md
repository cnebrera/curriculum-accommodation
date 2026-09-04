# Tasks: Pictograms — the family we planned and never built

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-08-31

Twenty-one tasks. The order is the argument: **the licence refusal, then the
per-learner gate, then matching, then anything that draws a picture.** Each of
those three is a safeguard the next one could otherwise be built around.

---

## Phase 1 · The refusals, before anything can insert a picture

- [x] T001 `packages/core/test/pictogram-licence.test.ts`: **the repository
      contains no pictogram asset** (SC-1601). Walks the tree, fails on any image
      that is not one of ours, and names the file. Written first, because a licence
      assertion added after the feature works is one written to fit what already
      happens *(done, red first — and it found something else. Atkinson Hyperlegible is bundled and was credited **nowhere**: not in `NOTICE`, not in `LICENSE-CONTENT.md`, not in the built application, and the OFL requires the notice to accompany the files. The same class of failure this whole feature is built around, found in our own repository while writing the check meant to catch it elsewhere. `NOTICE` now credits it; the OFL text itself is backlog **G21** and is not being reproduced from memory.)*
- [x] T002 Assert `packages/core/src/pictograms/` reaches no network — in the
      isolation suite, which already walks all of `core`. A set is fetched by her,
      never by us (FR-1601) *(done, and the honest version took three attempts. The first flagged any file mentioning ARASAAC near a URL and caught two of its own — `render/attribution.ts`, whose ARASAAC URL is **required by the licence**, and `pictograms/set.ts`, whose comment says we do not download. What is forbidden is a network call, so that is what is checked, over code with the comments stripped.)*
- [x] T003 Author `instructions/pictograms.md`: what pictograms are for, when they
      help, and the sentence this feature exists to honour — a dyslexic
      fifteen-year-old does not want a worksheet that looks like it is for a
      five-year-old. Corpus, per Principle I. Carries the minimum print size
      (research R4) so it can move without a release *(done: `instructions/pictograms.md`, carrying `min_print_mm` and the three scopes with when each helps. It leads with «esto añade cosas a la hoja» and the fifteen-year-old who does not want a five-year-old's sheet, because those are the two facts that make this family different from every other one.)*

---

## Phase 2 · Foundational · the gate that keeps the decision hers

- [x] T004 `pictograms` on the profile schema: `enabled`, `scope`, `decided_on`,
      `overrides`. Optional, absent by default, and **absent means off** *(done. Absent means off, and that is the only default. `decided_on` is stamped when **she** turns it on, because a flag with no date is indistinguishable from a flag something else set.)*
- [x] T005 [P] Assert **no axis value can enable it** (FR-1605, SC-1603): a test
      over `selectRecipes`' own signature and over the apply path, so there is no
      code in which an axis reaches this family. The structural half of Principle
      V, exactly as `015` T005 did it for ordering *(done: `pictograms-not-automatic.test.ts`. `applyPictograms` takes no profile and cannot reach an axis; the recipe corpus has no pictogram family for `selectRecipes` to return; and selection over a profile with every axis at its maximum returns nothing about pictograms. The scan reads **code with the comments stripped** — my first version flagged `apply.ts` for the word «axes», inside the comment explaining that it cannot read one. Sixth time in this project.)*
- [x] T006 [P] `pictograms` joins the fields an erasure plan names and erases
      (`003`): it is a recorded decision about a child *(done. It lives in `profile.yaml` so `learnerDir` already took it; what was missing was the plan **saying** «si usaba pictogramas» — a recorded decision about how a child is seen is closer to the reason erasure exists than a course is.)*

---

## Phase 3 · US3 — the right pictogram, or none (P1) 🎯 MVP

**Goal**: «rana» gets the frog, or it gets nothing. Never the wrong one.

**Independent test**: over a fixture set with a deliberate ambiguity, zero wrong
pictograms, and the ambiguity reported with its candidates.

- [x] T007 [US3] `packages/core/src/pictograms/set.ts` per
      [contracts/pictogram-set.md](contracts/pictogram-set.md): read a directory,
      build **keyword → ids** (plural), report what it found and in which language *(done: `packages/core/src/pictograms/set.ts`, reader-injected so `core` stays side-effect-free and the isolation suite keeps covering it. **keyword → ids, plural**, which is where the ambiguity lives.)*
- [x] T008 [US3] The unusable-set cases, each named rather than collapsed into «no
      pude leer la carpeta»: no metadata, metadata with no images, unreadable JSON,
      images only. **Filenames are not metadata** *(done, four cases each named. The one that matters is «images only»: a directory of `rana.png` looks like a set, and guessing from filenames is the wrong-pictogram failure this feature exists to prevent — she reads the text, the child reads the picture, and nobody notices. An unreadable language file is named **and the rest of the set still loads**, the same rule `011` FR-907 applies.)*
- [x] T009 [US3] `packages/core/src/pictograms/match.ts`: her override, then the
      name check, then normalise, then **exactly one or nothing** (FR-1608…1610) *(done: override → name check → normalise → exactly one or nothing. The name check runs **before** the override, so a name cannot be overridden into a pictogram.)*
- [x] T010 [US3] An ambiguous word is omitted **and reported with its candidates**
      (FR-1609). A word with no match is omitted silently — most words have none,
      and reporting each would bury the ones that matter *(done. Ambiguous is omitted and reported with its candidates; no match is omitted **silently**, because most words have none and reporting each would bury the handful where the set genuinely offers a choice.)*
- [x] T011 [US3] Write `packages/core/test/pictograms.test.ts` with a fixture set we
      author: an unambiguous word, an ambiguous one, a name, an accented word, a
      word in the wrong language, and an id whose image is missing *(done: 23 cases over a fixture we author — an unambiguous word, a deliberate two-picture ambiguity, a name the fixture has a pictogram for, an accented word, a word in the wrong language, and an id whose image is missing.)*
- [x] T012 [US3] `packages/core/src/pictograms/apply.ts`: insert into the IR as
      `data-picto` per pictogram, scoped as she chose — everywhere, instructions
      only, or key vocabulary only *(done: `apply.ts`, and it takes no profile so it cannot consult an axis even by mistake. `data-picto` records **word=id** rather than the id alone, because an id by itself cannot be checked by a human reading the document.)*
- [x] T013 [US3] **The exam rule** (`012`, Principle III): no pictogram on a
      question whose subject is the word itself. A pictogram beside «rana» in a
      vocabulary test supplies the answer, which is changing what is asked *(done, and deliberately broad: it fires on «qué significa», «qué es», «cómo se dice», «define», and on the word in quotes. A false positive costs one missing picture; a false negative costs a child's mark. Checked **per block**, so one assessment block in a worksheet does not disarm the rest of it.)*

**Checkpoint**: matching is honest before anything is drawn. *(Met. 23 cases over a
fixture with a deliberate ambiguity: zero wrong pictograms, and the ambiguity
reported with its candidates.)*

---

## Phase 4 · US1 — she brings the set (P1)

- [x] T014 [US1] Point Rampa at a folder, and record **its location and licence**
      in the vault — never a copy of the set and never a cached index of it *(done, and the split matters: the **path** goes in application settings because it is machine-specific and a vault must stay portable; the **licence** goes in the vault as `pictogramas.md`, because a colleague who opens the folder needs to know what is required of them. Neither is the set: nothing copies or indexes somebody else's licensed content, and a cached index would be exactly that.)*
- [x] T015 [US1] Before she configures one, say what the licence requires,
      including that a sheet containing pictograms is a derivative work under
      CC BY-NC-SA (FR-1602). And **no download button** (FR-1601): Rampa says what
      to fetch and from where *(done, and it is in the profile editor rather than on a settings page — the set is only needed once she has decided a learner uses pictograms, and a page she has to find first would mean turning the family on and getting nothing with no idea why. The licence text comes **before** the folder picker: she is entitled to know that her own sheets inherit BY-NC-SA before she builds a term of them on it. **No download button**, in the screen or in the preload.)*
- [x] T016 [US1] A set that moved or was deleted: sheets still render, and say the
      image is missing (FR-1616) *(done at both ends: a missing image renders a named gap with the id it wanted still in `data-picto`, and a folder that moved is reported as «puede que la hayas movido» with «las hojas que ya hiciste se siguen viendo» — a thing to fix, not a thing that broke.)*

---

## Phase 5 · US2 — she decides, per learner (P1)

- [x] T017 [US2] The control in the profile editor, with the three scopes and the
      sentence about what this costs a child in a mainstream classroom *(done, with the sentence about what it costs a child in a mainstream classroom on the control itself. `overrides` is carried rather than surfaced: a form field for a map would be a worse editor than the text file she already has.)*
- [x] T018 [US2] Where it is off, **the report does not propose it** (FR-1607). A
      tool that keeps proposing pictograms is a tool arguing with her about how a
      child is seen *(done, and asserted rather than observed: the report says **nothing at all** when the field is absent, the adapt prompt never mentions pictograms, and no recipe does either — which is the same assertion as T005 from the other side.)*

---

## Phase 6 · US4 — it prints, and it is legal (P1)

- [x] T019 [US4] `packages/core/src/render/attribution.ts`: derived from the
      document, beside the draft mark, and **no parameter** — the defect `007`
      FR-509 found was a renderer that could ask for an unmarked sheet *(done: `render/attribution.ts`, derived from the document with **no parameter**. `007` FR-509's defect was a renderer that could ask for an unmarked sheet; a licence condition passed as an argument is one somebody passes `false`. At the foot rather than the head, unlike the draft mark — that one must stop her handing the sheet out, and this is a legal line about a document that is otherwise fine.)*
- [x] T020 [US4] Embedded as data URIs in HTML and ODF, so a sheet survives being
      emailed to a colleague without the set (FR-1615) — and every pictogram
      carries its text alternative (FR-1614) *(done. Data URIs so a sheet emailed to a colleague without the set still shows the pictures — and so a `file://` path never puts where her set lives into a document she sends. Every pictogram carries `alt`, and the **word is always printed beside the picture**: on a greyscale photocopy the colour distinctions are gone and the word is what still works.)*
- [x] T021 [US4] A missing image degrades to a named gap, and the provenance still
      says which id it wanted (FR-1616) *(done, and the attribution still appears — the document still claims a pictogram, so the licence condition still applies even where the image is missing.)*

---

## Not in scope, recorded so it stays a decision

- **Fetching the set, even behind a confirmation.** FR-1601 is absolute, and a
  download button makes us the distributor of CC BY-NC-SA content inside an
  Apache-2.0 application.
- **A mapping file of ours.** The set's metadata is the vocabulary (FR-1608); ours
  would be a second one to maintain and to get wrong, and FR-1612 already gives her
  the override for the cases the set gets wrong for her school.
- **Generating or choosing images with a model.** Not a performance decision: a
  model choosing a picture is the wrong-pictogram failure with no traceability.
- **An AAC communication board.** A different product, and ARASAAC's own materials
  do it better.

## Dependencies

- Phase 1 blocks everything. Phase 2 blocks Phase 3's apply path.
- `017` for an overlay that prescribes pictogram support — **not blocking**: the
  profile field is the mechanism either way, and `017` sets it.
- `019` for the text alternative, which is the same field braille and audio need.
- **SC-1605 and SC-1606 need a person.** SC-1606 is the one this feature is judged
  on, and it is the negative half: a PT who does *not* use pictograms says Rampa
  never pushed her toward them.

## What is verified, and what is not

**Verified**: 1,103 unit tests across 68 files and 63 e2e. Including: no image asset
in the repository that is not ours; nothing in the pictogram path can reach the
network; no axis code anywhere in the module and no pictogram recipe for selection
to return; ambiguity produces omission plus a report line; a name is never matched;
the exam rule per block; the attribution derived with no parameter; a missing image
degrading to a named gap that still carries the id and still carries the
attribution.

**Not verified**: nobody has run this against a real ARASAAC download, and nobody
has photocopied a pictogram sheet. The set contract is documented rather than
reverse-engineered (research R2) precisely because we do not have a sample — and
if turning a real download into that layout proves to be friction, a teacher will
say so and we will then have a sample to write a parser against.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here.
The reason is the one `002` learned the hard way: **a requirement nobody can point
at is a requirement nobody is keeping.**

| | Where it is satisfied |
|---|---|
| FR-1603 | T019 · `attributionFor(doc)` is **derived and takes no parameter**, for the reason `007` FR-509 established: a licence condition passed as an argument is one somebody passes `false`. Asserted with `signedOff: true`, which removes the draft mark and changes nothing about the licence |
| FR-1604 | T007 · nothing in `pictograms/` names ARASAAC, the set contract is documented rather than reverse-engineered, and `attributionFor` takes a different set's credit. `pictogram-render.test.ts` asserts a non-ARASAAC attribution renders |
| FR-1606 | T004 · `pictograms.enabled`, `scope` and `decided_on` on the profile. The date is stamped when **she** turns it on, because a flag with no date is indistinguishable from a flag something else set |
| FR-1610 | T009 · the name check runs **before** the override and before the set, so «Lucía» gets nothing even if her school's override names it and even if the set has a keyword for it |
| FR-1611 | T012 · `data-picto` records **word=id**, not the id alone — an id by itself cannot be checked by a human reading the document |
| FR-1612 | T004/T012 · `pictograms.overrides` on the profile, word → id, consulted **before** the set so hers wins; `apply.ts` reads it and `data-picto` records the id it used either way. **A control since 2026-09-04** (review COD-25, decision P48): it was «carried rather than surfaced» — `ProfileEditor` parked it in `_pictoOverrides` with nothing to edit it, `ChooseWord` writes only to the global vocabulary, and G30 (which said «the override is a field only a developer can set») was closed «by `024`», which built the vocabulary chooser and not this. So a MUST was satisfiable only by editing YAML by hand. Now a collapsed control on the learner's page, offered only when a set is installed — with no set there is nothing to point a word at, and FR-2303 wants one way to fix that. The vault file is still the other editor. **Not the name check**, which runs before both — FR-1610 outranks her override, deliberately |
| FR-1604 | The set is replaceable, and **the attribution is hers** since 2026-09-04 (review COD-08, decision P40). It was not: `attributionFor(doc, attribution = ARASAAC_ATTRIBUTION)` took an alternative credit and **both call sites called it with no second argument**, so the parameter was dead and the constant was all that ever printed — a teacher with her own folder and its own LICENSE, which `readSet` reads and shows her and never passed to the render, printed «Autor pictogramas: Sergio Palao · Origen: ARASAAC» on every sheet. A **false** attribution, legally worse than a missing one, and the only thing that ever exercised the parameter was the unit test that «proved» it worked. The credit is now derived from the sources the document records (`data-picto` carries `word=id@publisher`), with the words from the publisher catalogue and from her set's LICENSE, and `attributionFor` has **no default** |
| FR-1615 | T020 · embedded in the HTML as `data:` URIs, so a sheet survives being emailed without the set. **And in the ODT since 2026-09-04** (review COD-24, decision P47): `render/odt.ts` contained not one reference to `data-picto`, an image or an attribution, so a sheet **with** pictograms exported to ODT came out without them, with no marked gap and without saying anything — a silent loss of a support she had turned on, in the modality that exists so she can retouch and reprint. Now `Pictures/` plus a manifest entry per picture, the word beside each one, and the same credit as the PDF |
| FR-1613 | T020 · as far as anything here can: a 20 mm minimum from the corpus, and **the word always printed beside the picture**, because on greyscale the colour distinctions its design uses are gone. SC-1605 needs a real photocopier and is recorded as unmet |

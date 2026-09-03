# Tasks: Material que se ve, no sólo que se lee

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-03

Twenty-seven tasks, and the first two are attacks. Markup written by a model and rendered
by this application is the largest new attack surface the project has taken on (US3, P1),
so the tests that a script does not run, a remote reference does not fetch, and a stray
element is refused rather than sanitised are written **before the validator or the drawer
exist** — a security check written after the renderer works is a check written to fit
what the renderer already does.

The shape of the rest follows the plan's one decision: quantities are stamped by
`buildSheet` from exercises `002` already verified, the theme rides the compose call that
is already paid for, and one deterministic drawer serves every modality.

---

## Phase 1 · Setup · the US3 tests, red, before anything can pass them

- [ ] T001 [US3] Write `app/packages/core/test/figures-refuse.test.ts` **first**, red,
      per [quickstart.md](quickstart.md) §1: markup containing a script, an event
      handler, `href`/`xlink:href`, `<image>`, `<use>`, `url()`, a `data:` scheme,
      `<style>`, `<foreignObject>`, an entity, a comment, CDATA — and an **allowed**
      element with a hostile value — is refused whole, with the offending token quoted.
      **Refused, not sanitised** (FR-2008, FR-2009): assert no output resembles a cleaned
      version of the input, because rewriting attacker-shaped input hides the event worth
      seeing (`007` FR-508's rule, applied here)
- [ ] T002 [P] [US3] Write `app/packages/core/test/figures-never-a-way-in.test.ts`
      **first**, red: a document whose figure block carries each hostile payload renders
      to a sheet that (a) still exists, minus the diagram, with the refusal reported
      (FR-2011); (b) contains no `<script`, no `on*=`, no `href`, no `url(`, no `http`
      anywhere in the output string (FR-2010); and (c) raw SVG in an **ordinary** block's
      content stays escaped text — the fenced-figure branch is the only road from model
      markup to drawing
- [ ] T003 [P] [US1] Write `app/packages/core/test/figures-quantities.test.ts` **first**,
      red, from quickstart §2: SC-2001 as an invariant over a generated corpus — every
      diagram's quantities equal its exercise's (FR-2001); a request with disagreeing
      numbers is drawn with the exercise's and reported as corrected (FR-2002); an
      unverified group gets no diagram (FR-2003); rendering twice yields byte-identical
      SVG (FR-2004)

---

## Phase 2 · Foundational · the validator and the drawer, pure, before compose pays for anything

**Blocking**: Phases 3-6 do not start until T001 is green against T004 and T003's
determinism case is green against T005.

- [ ] T004 [US3] `app/packages/core/src/render/figures/validate.ts` · `validateGlyph`
      per [contracts/figures.md](contracts/figures.md): the closed element list, the
      attribute list, the **value rules** (paints without `url(`, numeric path grammar,
      no `<`/`&`/`http`/`javascript`/`data:` in any value), the fragment bounds
      (elements, bytes, depth). In code, not corpus: a structural defence (Principle IX)
      is not teacher-editable. Verdict type carries the quoted offending token, in her
      language
- [ ] T005 `app/packages/core/src/render/figures/draw.ts` · `drawFigure(fig)` → inline
      SVG for the four kinds (grid, groups, number-line, part-whole). Deterministic and
      pure (FR-2004): geometry only from `quantities`; glyph/theme choose what a cell
      looks like, structurally never how many (FR-2005). Repetition by inlining — no
      `defs`/`use`, so T002's «no `href` anywhere» stays a one-line assertion. Counting
      rides on discrete outlined shapes, never on colour (FR-2013). `role="img"` +
      `aria-label` = description. Plain built-in glyphs when no theme (FR-2006)
- [ ] T006 [P] `instructions/figures.md` · the judgement layer, plus its parser
      `app/packages/core/src/render/figures/corpus.ts` (the `parseAudioCorpus` pattern):
      which kind suits which operation; the bounds past which a diagram stops being one
      (`max_cells` etc., clamped in code against typos — `compose.md`'s budget pattern,
      FR-2015); the per-kind description templates with quantity and theme slots
      (FR-2012); the request-format section the prompt sends; and «el tema, no el
      personaje» — no third party's characters, logos or property, names included
      (FR-2007). Corpus because every one of these is a judgement a PT may correct —
      except the allowlist, which deliberately is not here

**Checkpoint**: T001 green, T003's determinism green, offline suite passing, no caller
changed, no provider involved.

---

## Phase 3 · User Story 1 · A diagram that is right (P1) 🎯 MVP — ships only with Phase 4

- [ ] T007 [US1] `app/packages/core/src/compose/figures.ts` · `parseDiagramRequests`
      over the compose response (`parseProposals`'s tolerance: an unparseable line is no
      request, never a guess). The parsed type has **no numeric field** (data-model.md);
      stated numbers are discarded and, where they disagree with the exercise, surfaced
      for the report (FR-2002). Kind names map from the corpus's declared spellings;
      unknown kind = no request
- [ ] T008 [US1] `app/packages/core/src/compose/sheet.ts` · `buildSheet` stamps a
      `.figure` block per matched request: `data-figure`, `data-of`, kind-specific
      quantity attributes computed from the **accepted** exercise's operands and verified
      answer (FR-2001), `data-theme`, `data-description` from the corpus template with
      code-interpolated quantities (FR-2012), validated glyph as the fenced content.
      Requests pointing at rejected exercises or **unverified groups stamp nothing** —
      the same branch that keeps their answers out of the key (FR-2003). Kind unsuited
      to the operation per the corpus table: refused and reported, not remapped. Bound
      exceeded: no diagram plus the bound named — never clamped, a clamped grid is a
      wrong-quantity diagram (FR-2015)
- [ ] T009 [US1] `app/packages/core/src/render/html.ts` · the figure branch: a `.figure`
      block with `data-figure` is drawn via `drawFigure` after **re-validating** the
      glyph (the vault is hand-editable; `007`) and cross-checking `data-of` — if the
      referenced exercise still parses, its operands must match the stamped quantities,
      else the figure is refused with a notice (FR-2016's second net). A refusal renders
      as its sentence and the sheet survives (FR-2011). The fence is never
      markdown-rendered
- [ ] T010 [US1] `app/packages/shell/src/jobs/compose.ts` · the corpus's request-format
      section joins the propose prompt (loaded via `loadInstruction('figures')`, never a
      literal — Principle I), responses go through `parseDiagramRequests`, matched
      requests reach `buildSheet`, and every refusal, correction and bound lands in
      `notes` → the report (FR-2002, FR-2011, FR-2015). **No new provider call**: the
      request rides the existing propose loop, asserted by the provider-call count in
      the tests
- [ ] T011 [US1] Corrections and staleness: correcting a composition re-runs `runCompose`
      (`021` T026's path), so figures are rebuilt with the sheet — assert in
      `app/packages/shell/test/` that after a correction changing an exercise's numbers,
      no rendering anywhere carries a diagram with the old numbers (FR-2016, `005`
      FR-520's edge case)
- [ ] T012 [P] [US1] The report says what happened, in her language, quoted and located:
      «la cantidad la corregí yo» (FR-2002), «rechacé un diagrama, y por qué» with the
      offending token (FR-2011), «no dibujé: pasa del límite» with the bound (FR-2015),
      «no dibujé: nada pudo comprobar ese ejercicio» (FR-2003). Sentences from the
      corpus where they are judgement; facts interpolated by code
- [ ] T013 [US1] `app/e2e/figures.spec.ts` from quickstart §4: compose with diagrams,
      view, print — **a real PDF produced, stated, not typechecked** — and the planted
      hostile document loaded in the viewer and the PDF path with zero network requests
      and zero execution, asserted from the request log (FR-2010, SC-2002)

**Checkpoint**: beside `4 × 3 =` there is a rectangle of twelve cells, because the
exercise says twelve — but nothing ships until Phase 4 is green (US3 ships with US1 or
US1 does not ship).

---

## Phase 4 · User Story 3 · It cannot become a way in (P1, ships with US1)

Most of US3 is already encoded in T001/T002/T004 (written first) and exercised by T013.
What remains is closing the outer wall and the egress:

- [ ] T014 [US3] Assert the outer defences against a document that tries: the viewer's
      `seal()` (no script permission, no navigation, no remote — `021` T014) and
      `renderPdf`'s `javascript: false` window, over a figure-bearing hostile document —
      extend `app/e2e/composed.spec.ts` or fold into T013's spec. And assert
      `packages/shell/test/boundary.test.ts` still counts the same twelve Electron files:
      this feature adds **no** new Electron surface
- [ ] T015 [P] [US3] `app/packages/core/test/figures-egress.test.ts` · learner data
      planted where the model could put it — theme, label, glyph text — is caught by the
      existing egress check on every modality: `checkOutput` strips tags, so SVG `<text>`
      content is visible text to it; assert with a code, a known name and a school
      (FR-2014, `011` FR-910, `015` FR-1306)

**Checkpoint**: SC-2002 — markup trying script, handler and remote reference produces no
execution, no fetch, and a reported refusal. Now, and only now, US1 can ship.

---

## Phase 5 · User Story 2 · A diagram that is his (P2)

- [ ] T016 [US2] The propose prompt themes only from recorded interests: with
      `profile.interests` present the corpus section invites a theme drawn from them
      (words and shapes, never artwork); with none recorded the prompt does not invite
      theming and any arriving theme is dropped for **plain** — themed at random is
      inventing a fact about a child (FR-2005, FR-2006). In
      `app/packages/shell/src/jobs/compose.ts` beside the existing «Le interesan:» lines
- [ ] T017 [P] [US2] `app/packages/core/test/figures-theme.test.ts` · SC-2003 offline:
      two profiles, different interests, one objective, mocked proposals → two sheets
      whose quantities agree in every figure and whose themes differ; and the no-interest
      profile gets plain figures. Theme structurally cannot move a quantity: the drawer's
      geometry reads only `quantities` (asserts T005's seam) (FR-2005)
- [ ] T018 [US2] The property line (FR-2007): the corpus instruction from T006 is sent
      (assert presence in the prompt, the `no-grade-ever` pattern for prohibitions); the
      structural half is the allowlist — no `image`, no `use`, no external reference
      means no artwork can be embedded (cites T004); and the report notes that a theme
      naming a brand was used **as a theme** («cartas de un juego», not the mark). The
      rest is her review — recorded as a limit, not claimed as solved

**Checkpoint**: the same twelve cells, and they are cards for one child and buses for
another, and the mathematics is identical.

---

## Phase 6 · It is a document, so it is every rendering (with US1, not after it)

- [ ] T019 [US1] `app/packages/core/src/render/odt.ts` · the figure branch (research
      R5): the drawer's SVG bytes into the ZIP as `Pictures/<id>.svg` with a manifest
      entry and a `draw:frame`, the description as the paragraph beneath —
      unconditional, it is the sentence she can fix — and a refused figure exports as
      its refusal sentence, agreeing with HTML (FR-2011, FR-2012). Today `figure` maps
      to `Cuerpo` and would print the raw fence as prose — assert the fence appears
      nowhere as text
- [ ] T020 [P] [US1] `app/packages/core/test/figures-linear.test.ts` · audio-ready and
      braille-ready over a document with all four kinds: each diagram appears **as its
      description** (`data-description`, stamped by T008, consumed by `019`'s
      `renderLinear`), no glyph markup in either text, nothing silently dropped —
      asserted here rather than delegated to `019`, per the review's finding (FR-2012)
- [ ] T021 [P] [US1] `app/packages/core/test/figures-photocopy.test.ts` · FR-2013 both
      halves: `checkPhotocopy` over a themed sheet reports no colour-collapse between
      figure colours and page colours, and a greyscale-blindness assertion — strip all
      `fill`/`stroke` to black-on-white and every count is still countable (discrete
      shapes, T005's rule), no meaning carried by colour alone (`010` FR-812)

---

## Phase 7 · Polish · and the parts that need a person

- [ ] T022 **Look at it** (`013`'s rule): `npm run shots`, plus the exported ODT opened
      **in LibreOffice** — «embedded SVG renders in LibreOffice» is a claim about
      somebody else's software (quickstart §6). A themed grid at arm's length, the recta
      at `xlarge`, a refused diagram's sheet read as a whole page
- [ ] T023 **SC-2005 needs a photocopier**: quickstart §7, a sheet with all four kinds
      through a real black-and-white photocopy. The second criterion in this project to
      need a physical machine; record the result in `specs/006-desktop-app/validation.md`
      honestly, including «not done» if not done
- [ ] T024 **SC-2006 needs a teacher**: the themed sheet and the plain one, no preamble —
      which would she put in front of the child, and why. The only criterion that can
      come back «no» with everything else green, and «why not» is worth more than the
      answer
- [ ] T025 [P] Run quickstart §5 with a real key: two learners, one objective, quantities
      agree, themes differ, refusals and corrections legible in the report (SC-2003, and
      the provider-call count unchanged — no new call)
- [ ] T026 Settle `022`'s record (P21, CONS-01 — the corrections themselves landed on
      2026-09-03; this task is the half they deferred): re-assert the `022` half of
      `specs/023-los-pictogramas-los-trae-rampa/tasks.md` T023 against diagrams that now
      exist — its correction note says «re-assert when `022` actually builds its
      diagrams», and this is that moment; confirm
      `app/packages/core/src/pictograms/fetch.ts:64`'s citation of `022` FR-2008 now
      names an implemented rule (T004) rather than vapour; and close `specs/BACKLOG.md`
      **G38** with a pointer to this tasks file
- [ ] T027 Archive it: this coverage table kept current, `specs/BACKLOG.md` entry for
      anything found on the way, and `specs/006-desktop-app/validation.md` updated with
      what was **actually** rendered, printed and photocopied — this feature exists
      because a tick once claimed more than the code could show

---

## Not in scope, recorded so it stays a decision

- **Diagrams for adapted material.** Unverified quantities, nothing safe to draw from
  (spec assumption). Structural: figures are born in `buildSheet` and nowhere else, and
  T009's render-time validation meets anything arriving another way.
- **Word problems and exams** — `027`. Its verified quantities plug into the same
  `(kind, quantities, theme)` seam this feature builds; nothing here parses narrative
  statements, nothing there draws. `027` FR-2511 already cites `022` FR-2005/FR-2006 for
  the theme rule — one rule, cited, not copied.
- **Pictograms** — `023`. A diagram is not a pictogram; nothing here fetches anything,
  from Aragón or anywhere.
- **New figure kinds.** Grids, groups, number lines, part-whole bars — what `002`'s
  verifiers can stand behind. A kind nothing can verify does not belong in v1.

## Dependencies

- T001–T003 before everything, red first.
- **Phase 2 blocks Phases 3–6**: T004 before T007–T010 (nothing pays a provider to
  exercise code that does not exist); T005 before T008/T009; T006 before T008/T010/T016.
- T007 → T008 → T009 → T010 in order; T011/T012 after T010.
- **Phase 4 blocks shipping Phase 3**: US3 is P1 alongside US1 — T013+T014 green or no
  diagram ships.
- T016 → T017/T018. US2 starts only after T003 (SC-2001) is green: a charming diagram
  with the wrong number of cells is worse than a plain one.
- **T019–T021 land with US1, not after it**: a diagram that reaches print before it
  reaches the linear renderings recreates, for the learner who needs it most, the gap
  this feature closes.
- T026 after T013 (the assertion `023` claimed becomes possible only when diagrams
  exist). T022–T025 need built software; T023/T024 need a machine and a person and are
  the arrangement, not the verdict.

---

## Coverage · every requirement, and where it is

`check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here. Written
**with** the tasks, per the lesson `002` taught on 2026-08-31 — and this table is the
artefact `022` never had, which is how a spec got called «shipped» with nothing behind it.

| | Where it is satisfied |
|---|---|
| FR-2001 | T008 (stamped from the accepted exercise, by construction) · T003 (SC-2001 as invariant) |
| FR-2002 | T007 (stated numbers discarded and compared) · T012 (the correction reported) · T003 |
| FR-2003 | T008 (unverified groups stamp nothing — the answer-key branch, reused) · T003 · T012 (the reason named) |
| FR-2004 | T005 (pure drawer) · T009 (no model, no lookup at render) · T003 (byte-identical twice) |
| FR-2005 | T005 (geometry reads only quantities — structural) · T016 · T017 |
| FR-2006 | T016 (no interest → plain, never random) · T017 |
| FR-2007 | T018 · corpus wording in T006 · structural half in T004 (no image, no reference) · the honest remainder is her review |
| FR-2008 | T004 (the allowlist, refuse-not-sanitise) · T001 (red first) |
| FR-2009 | T004 · T001 · T002 (nothing executes in any rendering) |
| FR-2010 | T004 (no reference can survive validation) · T002 (no `href`/`url(`/`http` in output) · T013/T014 (zero network requests, from the request log) |
| FR-2011 | T009 (refusal renders as its sentence, sheet survives) · T019 (ODT agrees) · T012 (reported) · T002 |
| FR-2012 | T008 (`data-description` stamped, corpus template) · T020 (audio + braille, asserted) · T019 (the editable export, explicitly — research R5) |
| FR-2013 | T005 (counting on discrete shapes, never colour) · T021 (photocopy check + greyscale assertion) · T023 (the machine) |
| FR-2014 | T015 (egress check sees SVG text; code, name, school planted and caught) |
| FR-2015 | T006 (bounds in corpus, clamped in code) · T008 (bound exceeded → no diagram, never clamped) · T012 (the bound reported) |
| FR-2016 | T011 (a correction rebuilds figures with the sheet) · T009 (render-time cross-check against `data-of` for hand-edited documents) |

# Tasks: Cómo llegan las versiones — la app avisa, el corpus viaja solo

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-03

Twenty-nine tasks, and the first two are the invariants: the whole application still
works offline with the update machinery present (SC-3202), and a tampered update changes
zero files (SC-3204). Both are written **before** the machinery they constrain exists,
because an invariant test written after the feature works is a test written to fit what
already happens — and these two failures would be silent.

The shape of the rest follows Phase 0: **one resolution replaces `corpusRoot()`**, and
once it exists the corpus channel is a store, a verifier and two screens; the app channel
is mostly `releases.ts` learning to say one more sentence.

---

## Phase 1 · Setup · the two invariants, first and red

- [x] T001 Write `app/packages/shell/test/updates-offline.test.ts` **first**, red where it
      can be: with the update machinery present and a transport that **fails the test if
      called at all** (the `transportFor` pattern), the full offline suite passes, a check
      with no network is silence — no error surfaced, no interruption, work unaffected
      (**FR-3202**, SC-3202) — and the update surface holds no vault reference to learner
      data
- [x] T002 [P] Write `app/packages/core/test/corpus-update-verify.test.ts` **first**, red:
      every tampered fixture from [quickstart.md](quickstart.md) §2 — bad signature,
      altered bytes, truncation, interruption, unsupported format — is refused whole and
      `userData/corpus/` is **byte-identical** after, checked by hashing the store, not by
      the absence of an error (**FR-3211**, **FR-3210**, SC-3204)
- [x] T003 [P] Fixture feeds in `app/packages/providers/test/fixtures/`: a release feed
      (newer / same / 404 / garbage), a corpus feed (manifest + files + signature under a
      **fixture keypair**), and the tampered variants T002 consumes

---

## Phase 2 · Foundational · versions have numbers, the corpus has one root

**Blocking**: nothing in Phase 3+ may start until this phase is green. Applying an update
before every reader goes through one resolution is partial application by architecture —
some readers on the new corpus, some on the old — which is the on-disk version of what
**FR-3210** forbids on the wire.

- [x] T004 `app/scripts/bundle-corpus.mjs` + `CORPUS-VERSION.json` gain `version`
      (monotonic integer) and `formatVersion` per [data-model.md](data-model.md); the app
      declares its supported format in one constant beside the parsers it describes
      (**FR-3210**, research R4 — and the sibling rule: the vault's schema version is
      P50's number, not this one, coupled nowhere)
- [x] T005 `app/packages/core/src/corpus-update/` · `UpdateManifest`, canonical manifest
      bytes, Ed25519 verification via `node:crypto.verify` against the app-held public
      key, and per-file SHA-256 checks — pure functions over bytes, offline-testable,
      no new dependency (**FR-3211**, research R2). T002 goes green file by file here
- [x] T006 `app/packages/shell/src/corpus/active.ts` · `activeCorpus()` returning
      `ActiveCorpus` — **the case, not just a path**: bundled vs snapshot, newest wins,
      an incomplete or unsupported snapshot never governs (**FR-3205** groundwork,
      data-model rules 1–2). Every `corpusRoot()` caller in
      `app/packages/shell/src/corpus/` routes through it, and a structural test asserts
      no reader resolves a corpus path anywhere else (the `021` resolver lesson)
- [x] T007 [P] `instructions/updates.md` · the declared destinations — release check,
      corpus manifest, corpus files, releases page — in the `instructions/pictograms.md`
      declaration pattern, with the P23 sentence: these are the only hosts, reachable
      only when checking (**FR-3204**); parser in `app/packages/shell/src/corpus/`, and
      `releases.ts`'s constants become the bundled corpus's declaration read through it
- [x] T008 The governing corpus `version` reaches every job report
      (`app/packages/core/src/report/index.ts`): «con el criterio pedagógico versión N» —
      new jobs only, wired through where the report already receives its inputs
      (**FR-3207**, Principle VI)

**Checkpoint**: T001 and T002 green, suite green, and nothing user-visible has changed.

---

## Phase 3 · User Story 1 · «Hay una versión nueva» (P1) 🎯 MVP

**Goal**: a quiet notice with version, plain summary and link — and structurally nothing
else.

**Independent Test**: quickstart §4 against the fixture feed: newer → notice; same →
silence; no network → silence and no error.

- [x] T009 [US1] `app/packages/providers/src/releases.ts` · `UpdateStatus` gains
      `summary` (the release's plain-language notes), the endpoint comes from the
      declared destinations (T007), and failure stays a sentence, never a dialog
      (**FR-3201**, **FR-3202**)
- [x] T010 [US1] `app/ui/src/updates/` · the notice: one quiet line naming the version,
      the summary in her language, one link opened via the `links.ts` rule — declared
      https URL, never from the renderer — and it does nothing else (**FR-3201**). It
      never appears inside ensayo (`035`) and never interrupts a running job
- [x] T011 [P] [US1] Dismissal per version in `userData`
      (`app/packages/shell/src/ipc/`): dismissed stays dismissed for that version; only a
      newer one notices again (**FR-3203**)
- [x] T012 [US1] `app/packages/shell/test/notify-only.test.ts` · **the absence** (SC-3203,
      **FR-3201**): no binary-download path, no installer spawn, no `electron-updater` in
      the dependency tree — the test fails if any appears. Notify-only enforced by what
      does not exist
- [x] T013 [P] [US1] Disclosure: `app/ui/src/about/AboutScreen.tsx` lists both
      destinations, matched **in a test** against `instructions/updates.md`'s declaration
      so the two cannot drift (**FR-3204**); the Configuración toggle «comprobar al abrir»
      arrives default **off**, its copy saying what leaves the machine, at most weekly,
      never mid-job (research R5)

**Checkpoint**: fixes stop stranding — she learns a version exists, in her language,
without being nagged or phoned home without consent.

---

## Phase 4 · User Story 2 · The corpus updates itself, shown first (P1)

**Goal**: a corpus correction arrives in-app — read in full, accepted explicitly, applied
whole, governing new jobs only.

**Independent Test**: quickstart §5 steps 1–4 against the fixture corpus feed.

- [x] T014 [US2] `app/packages/providers/src/corpus-feed.ts` · manifest + files through a
      **gate-minted, injectable transport** (`transportFor` — no exported transport, so no
      second caller can bypass the gate), timeouts, redirect discipline, hosts from the
      declared destinations only (**FR-3205**, **FR-3204**, research R6)
- [x] T015 [US2] `app/packages/shell/src/corpus/updates.ts` · the store: fetch to
      `tmp-<runid>/`, verify signature before anything is shown, hash-check every file,
      publish a **complete** snapshot with one atomic rename into
      `userData/corpus/versions/<n>/`, discard temp on any failure (**FR-3211**,
      **FR-3205**; `writeAtomic`'s virtues at snapshot scale). T002's fixtures all pass
      through this path
- [x] T016 [US2] Format gate: a manifest whose `formatVersion` exceeds the supported one
      is refused **whole**, before fetch, with the reason and a pointer at the app notice
      (**FR-3210**) — never half-applied, never silently ignored
- [x] T017 [US2] Scan before activation: the verified files pass the `029`/`007` injection
      scan (`app/packages/core/src/ir/injection.ts` tiers plus section-spoofing);
      findings shown, quoted and located, activation refused by default (**FR-3211** —
      an update is an import with better provenance, not a bypass)
- [x] T018 [US2] `app/ui/src/updates/` · the offer: summary first, then **every changed
      file readable in full** (diff computed locally as a view, full text one gesture
      away), explicit accept as its own act, decline stable and unnagged with the offer
      remaining available (**FR-3206**, the `029` FR-2707 pattern)
- [x] T019 [US2] Apply = pointer move: new jobs read the new corpus and their reports cite
      it (T008); **signed documents and existing outputs untouched** — asserted both ways:
      byte-identical `output/` across an update, and structurally, no code path from the
      update store to `output/` (**FR-3207**)
- [x] T020 [US2] Conflicts per file (`app/packages/shell/src/corpus/updates.ts` + the
      offer screen): a file shadowed by a `recipes-local/` edit is marked; **keep** is
      default and free, **take** renames her file aside dated in her vault — visible,
      never deleted — **view both** shows both; undecided blocks nothing and hers keeps
      winning (**FR-3209**, research R3 — no merge, ever)
- [x] T021 [US2] `app/e2e/corpus-update.spec.ts` · quickstart §5 end to end against the
      fixture feed: shown → declined → accepted → cited in the next report → signed
      document byte-identical (SC-3201, **FR-3206**, **FR-3207**)

**Checkpoint**: Principle I's delivery mechanism exists — the exam tilde ships without a
reinstall, read before it acts.

---

## Phase 5 · User Story 3 · She can go back (P2)

**Goal**: reverting is a first-class act from the same screen, as visible as updating.

**Independent Test**: quickstart §5 step 5.

- [x] T022 [US3] Revert in `app/packages/shell/src/corpus/updates.ts` + the history
      screen: every accepted version retained (research R1 — nothing deleted implicitly),
      revert is a pointer move recorded in `active.json` history, and the prior version
      governs new jobs (**FR-3208**)
- [x] T023 [P] [US3] Reports after a revert cite the version she returned to (**FR-3207**),
      and the history shows the revert as plainly as the update — including the
      `superseded-by-bundled` entry when a newer app arrives with a newer bundled corpus
      (**FR-3208**, data-model rule 2)

---

## Phase 6 · Polish · and the parts that need a person

- [x] T024 The launch check behind the consent toggle: at most weekly, only at launch,
      never during a job, never inside ensayo (`035`), silent in failure — one
      implementation shared with the button, so there is exactly one place a check can
      start from (**FR-3202**, research R5)
      *(**Marcada hecha el 2026-09-06 y no lo estaba.** `launchCheck` no tenía ningún
      llamante, y «una sola implementación compartida con el botón» era el cuerpo de un
      manejador — que es exactamente por lo que la comprobación al arrancar no tenía a
      dónde ir. Corregido el 2026-09-07: `appVersionCheck` es una función en
      `updates/release.ts`, el manejador la delega y el arranque la llama.
      Y estuvo una hora apuntando a la comprobación **equivocada**, la del corpus: el
      consentimiento vive junto a «¿Hay una versión más nueva?» y sus palabras son «puedes
      mirarlo al abrir», así que lo que corre al arrancar es la de la aplicación. El canal
      del corpus no tiene ni quiere comprobación al abrir — FR-3206 hace de una
      actualización algo que se le **muestra** antes de aceptar, y no hay nada que mostrar
      hasta que ella pregunta.)*
- [ ] T025 [P] Release side, so the channel has something to carry: `corpus-v<n>` release
      flow with manifest + signature produced in CI (private key in CI secrets — signing
      the *installers* stays `COLA` P52's separate debt), and `docs/` note for
      contributors on when a corpus version bumps `version` vs `formatVersion`
- [x] T026 [P] Sweep the promises this vehicle was made for: `USD_TO_EUR` in
      `app/packages/core/src/cost/index.ts` («an update and not a release» — BACKLOG G29)
      now true — record in BACKLOG that the vehicle exists; `029`'s assumption («corpus
      updates travel via 034») pointed here
- [x] T027 **Look at it** (`013` FR-1113): `npm run shots` — the notice at its quietest,
      the offer with a long diff narrow and at `xlarge`, the conflict screen's «la tuya /
      la nueva», and whether a revert looks as dignified as an update (quickstart §7)
- [ ] T028 [P] Run the full suite with the machinery in place and the network unplugged —
      T001 as a standing gate, plus `npm run test:isolation` untouched: nothing in
      `packages/core` gained network reach (SC-3202, Principle II)
- [ ] T029 **SC-3205 needs a teacher**: a real offer, no preamble — can she say in her own
      words what will change about the material? The offer's readability is the
      Principle I claim itself, and this is the arrangement, not the verdict

---

## Not in scope, recorded so it stays a decision

- **Installing the app.** Ever, through any channel (**FR-3201**, SC-3203). The day
  auto-update seems convenient, contracts/updates.md rule 1 is the argument against.
- **Installer signing** — `COLA` P52: no public mac/Windows release without signatures.
  This feature's app channel only points at downloads.
- **The vault schema version** — P50's own work. Sibling number, different owner (R4).
- **A corpus registry/exchange between teachers** — `029`'s assumption stands; import of
  a file she has is `029`, distribution by the project is this spec, and nothing else
  exists yet.

## Dependencies

- T001, T002 before everything; T003 feeds both.
- **Phase 2 blocks Phases 3–6.** T004 before T005 (the manifest carries the numbers);
  T005 before T015; T006 before T019 and T022; T007 before T009, T013, T014.
- T012 lands **with** US1, not after it — the absence must be asserted before the first
  release ships a notice, or it asserts whatever shipped.
- T016 and T017 land **with** US2, before T021: an update acceptable before its gates
  exist is `002` FR-126's mistake with a distribution channel.
- T014 before T015; T015 before T018–T021.
- T022 before T023.
- T029 is the arrangement, not the verdict.

---

## Coverage · every requirement, and where it is

`scripts/check-fr-coverage.sh` fails if a requirement in the spec appears nowhere here.
Written **with** the tasks, per the lesson `002` taught on 2026-08-31.

| | Where it is satisfied |
|---|---|
| FR-3201 | T009, T010 (the notice: version, summary, link) · T012 (never installs — asserted as an absence, SC-3203) |
| FR-3202 | T001 (the invariant, first and red) · T009 (silent failure) · T024 (silent whichever way a check starts) |
| FR-3203 | T011 · **y T011 estaba a medias hasta el 2026-09-07**: el almacenamiento, el manejador y la línea del preload existían y **ningún lector los llamaba**, así que «cuando ella lo descarta» era un escenario sin sitio donde ocurrir. Encontrado barriendo los 181 canales después de `launchCheck` — el mismo defecto, una capa más arriba. Ahora hay un aviso en la portada con «No me lo recuerdes más», `updates:notice` contesta con su decisión ya aplicada (para que ninguna pantalla combine dos lecturas que pueden discrepar de una pregunta), y vuelve sólo para algo más nuevo |
| FR-3204 | T007 (declared in the corpus, the amended `007` FR-511) · T013 (the disclosure, matched in a test) · T014 (declared hosts only, nothing beyond the request) |
| FR-3205 | T014, T015 (obtainable and applicable in-app) · T006 (the resolution that makes «applicable without reinstall» true) |
| FR-3206 | T018 (shown in full, explicit accept, stable decline) · T021 (walked end to end) |
| FR-3207 | T008 (reports cite the governing version) · T019 (signed documents and outputs untouched, asserted both ways) · T023 (after a revert too) |
| FR-3208 | T022 (retained history, first-class revert) · T023 (as visible as updating) |
| FR-3209 | T020 (keep/take/view-both per file, no silent overwrite) · T006 (her overrides win by construction — the floor it stands on) |
| FR-3210 | T004 (the format version exists) · T016 (refused whole, with the reason) · T002 (the fixture proving it) |
| FR-3211 | T005 (signature + hashes, the trust root in the app) · T015 (verify-then-publish, atomic) · T017 (the `029` scan before activation) · T002 (tampered → zero files changed, SC-3204) |

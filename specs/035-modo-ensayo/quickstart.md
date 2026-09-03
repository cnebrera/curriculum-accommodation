# Quickstart — proving the rehearsal is free, marked and hermetic

Ordered so the two invariants that make the feature safe to build are checked before the
feature exists, and the one question only a person can answer comes last. Everything here
runs offline — that is the feature.

## Prerequisites

```bash
cd app
npm ci
npm run corpus     # bundles recipes/, instructions/, checklists/ — and sample/
npm test           # typecheck + the whole offline suite
```

A real vault with at least one real learner — the separation checks need something real
to protect.

---

## §1 · The two invariants, first and red

```bash
npx vitest run packages/shell/test/ensayo-boundary.test.ts
RAMPA_TEST=1 RAMPA_HIDDEN=1 npx playwright test e2e/ensayo-invariants.spec.ts
```

**SC-3302 — zero network, both stacks.** The runtime half counts every request during a
full rehearsal — Chromium's session *and* Node's `fetch`, because provider calls leave
through undici in the main process, and a `webRequest` counter alone would pass while a
request escaped. The structural half is the module-graph test: nothing under
`packages/shell/src/ensayo/` may import `@rampa/providers`, `ipc/keys.js`,
`ipc/vault.js` or `ipc/cost.js` — the same shape as `npm run test:isolation`.

**SC-3303 — the real vault, byte for byte.** Hash every file under the real vault before
the rehearsal; rehearse completely, including printing and typing a note; hash again.
Identical, to the byte — not «no ensayo files», but *nothing changed at all*. Then the
long form: connect a provider, do one real adaptation, and sweep the vault and ledger for
any sample marker (the fictional learner's code, the sample job id, «material de
ejemplo»). Zero.

Written before the rehearsal exists, red, because a separation check written after the
feature works is written to fit whatever leaks the feature already has.

## §2 · Offline · the store's lifecycle

```bash
npx vitest run packages/shell/test/ensayo-store.test.ts
```

| Case | Expected |
|---|---|
| Start a rehearsal | the root exists under `userData/ensayo/`, seeded from the bundled sample, laid out like a vault |
| Write through the rehearsal vault with a path that tries to escape | **refused**, by `resolveInVault` — the confinement came free and this proves it is on |
| Discard | the root is gone. All of it — typed note, outputs, state |
| Re-enter after discard | seeded fresh, works again (FR-3304's second half) |
| Restart mid-rehearsal | `ensayo.json` says where she was; resuming and starting over both work |
| The ledger inside the root | **does not exist** — an absence, asserted |

## §3 · Offline · the sample tells the truth

```bash
npx vitest run packages/shell/test/ensayo-sample.test.ts
```

- Every `data-recipe: id@version` in the sample's adaptation and report resolves in the
  bundled corpus at that version (FR-3310 — a report citing ghosts teaches that reports
  are decoration).
- The manifest's declared flaw exists: the reading and the source disagree at exactly the
  authored spot, and nowhere else.
- The profile carries `sample: true` and its declaration sentence; axes only, no surname,
  no diagnosis anywhere in the set (FR-3307, Principle V).
- Every document in the set carries the «material de ejemplo» sentence **in its content**
  and the pending-review mark — so every rendering is marked with no renderer branch.

## §4 · With a window · the whole journey, the first night

```bash
npm run build && RAMPA_TEST=1 npx playwright test e2e/ensayo.spec.ts
```

1. No provider connected: Rampa offers «probar con un ejemplo» **beside** connecting —
   two doors, neither pre-chosen (`016`'s rule), and the rehearsal is never a step in
   onboarding.
2. Meet the learner: the profile reads well and says out loud that he is invented.
3. Bring the sample photo; the reading arrives marked «simulado». **Find the flaw** — the
   walk fails if the verification screen does not surface a real disagreement to catch.
4. The adaptation arrives with its report; the step says what would have cost («esto
   habría costado unos 3 céntimos», labelled an estimate of a real run) — and the ledger
   badge shows her real month, unchanged.
5. Type a note containing a name: **the name question fires**, offline, and nothing was
   sent anywhere because there is nowhere to send it.
6. Review, sign — the draft mark comes off this sheet and only this sheet — and print:
   the PDF says «material de ejemplo» on the paper itself.
7. Every screen along the way carried the ensayo mark: asserted over the walk's own
   screen inventory (SC-3304).
8. Connect a provider (the test seam `connect.spec.ts` already uses): the rehearsal steps
   aside but stays reachable, still marked, still separate.

## §5 · Looked at, not asserted

```bash
npm run shots
```

Open them. The question for every ensayo screen is whether the mark is unmissable *while
being ignorable* — she has to learn the product through it, not around it. And the
printed sample beside a real printed sheet: at arm's length, in a pile of photocopies,
can the two be confused? No assertion answers that; SC-3304's test checks presence, this
checks sufficiency.

## §6 · On a machine that proves it (SC-3301)

Networking off — not «no provider connected», the interface down. Install, open, rehearse
to a printed, signed sample, timed. Under fifteen minutes, by someone who has never seen
Rampa. This is the closest a machine gets to the first night, and it is also the
disclosure check: nothing asked for a key, nothing waited on a connection, nothing cost
anything (FR-3302).

## §7 · The verdict only a teacher can give (SC-3305)

Let her rehearse one evening, unaided. Next morning, her real material, her real learner,
her own key: can she do the flow without help? **Transfer is the feature's purpose** and
the only success criterion that can come back «no» with everything else green. If she can
print a rehearsal sheet but stalls at her real one, the rehearsal taught the demo and not
the product — and «where did she stall» is worth more than the answer.

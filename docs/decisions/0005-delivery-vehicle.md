# 0005 — Delivery vehicle: who can actually run this

**Status:** Proposed · 2026-08-27 · **decision belongs to the project owner**

## Context

The harness assumes the teacher clones a git repository and opens it with an
agentic, filesystem-capable AI tool. Analysis in
[`docs/adoption-risks.md`](../adoption-risks.md) concludes that this serves
developers and teachers working beside someone technical, and does not serve the
community the project exists for.

Two consequences make this more than a convenience question:

- **A guarantee we cannot keep.** Preventing a learner's name from reaching a
  model is impossible in a bare agent CLI, because the teacher types it. It is
  enforceable only where something sits between the teacher and the provider.
- **A premise we would lose.** The community premise depends on recipes being
  plain files a teacher can read and change. A vehicle that buries them inside an
  application bundle trades the project's distinguishing property for
  convenience.

## Two facts that reframe the options

**A chat subscription is not an API token.** Claude Pro and ChatGPT Plus are
separate products from the API, with separate billing. A teacher with a paid chat
plan cannot hand a key to an application: they would have to create a developer
account and add a card. The barrier is the card, not the installer.

**The inference is nearly free.** Per adapted worksheet, at roughly 15K input
(selected corpus + profile + material) and 4K output:

| Model | Per worksheet | 20/month | With prompt caching |
|---|---|---|---|
| Haiku 4.5 | €0.03 | €0.64 | €0.45 |
| Sonnet 5 | €0.06 | €1.29 | €0.89 |
| Opus 5 | €0.16 | €3.22 | €2.23 |

The corpus is a stable prefix, so most of the input caches. A teacher's real bill
is one to three euros a month — an order of magnitude *below* the chat
subscription they may already pay for.

So money is not the obstacle. **Signing up for a developer account with a credit
card is.** Any option that requires an API key pays that toll, whatever it costs.

## Options

| | Reach | Name redaction | Recipes editable | Cost to build |
|---|---|---|---|---|
| **A · Harness only** (today) | Developers, assisted teachers | No | Yes | Done |
| **B · Local web app** over the harness | Teachers who can install and run one command | Yes | Yes, same folder | Medium |
| **C · Desktop app** (Tauri/Electron) | Teachers who can install software | Yes | Only if deliberately designed for it | High, plus signing, updates, three platforms |
| **D · Hosted service** | Everyone | Yes | No | High, ongoing, and it is the SaaS the project rejected |
| **E · Corpus as a Project bundle** for the chat app the teacher already pays for | Anyone with a paid chat plan, on any device, including a locked-down laptop | No | Yes — they are the uploaded files | **None. It is a download, not software** |

D is out: it breaks the local-data promise and recreates what the project was
founded against.

E was missing from the first version of this ADR, and it is the cheapest thing
that could possibly work. The teacher creates a Project (Claude) or equivalent,
uploads the recipe and instruction files once, then per worksheet uploads a photo
or PDF and names the profile. No install, no key, no card, no build, and it works
on a school laptop because it is a browser tab.

What E gives up: deterministic rendering (no ODT, no audio, no braille-ready
text), local memory files, name redaction, and corpus versioning — the teacher
re-downloads to update. What E keeps is the part Phase 0 exists to test: whether
the adaptations are any good.

## Recommendation (revised)

**E first, as the validation and early-adoption vehicle. A stays the contributor
path. Build B or C only once E has produced evidence that anyone wants this.**

Reasoning:

1. **The corpus is the project; the vehicle is not.** Recipes, the IR and the
   memory contract are the artifact worth defending. Vehicles are replaceable, so
   pick the cheapest one that reaches teachers — and E costs nothing to build,
   nothing to run, and nothing to distribute.
2. **B reads the same folder A does.** One data layer, two front doors. A recipe
   the teacher edits in a text editor is picked up by the app, which keeps the
   community premise intact — the property C would quietly destroy.
3. **B can enforce the redaction promise.** The app holds `A3 = Lucía` in a local
   encrypted store, displays the name because that is how a teacher thinks, and
   substitutes the code on every outbound request. The name exists in the UI
   layer and never in the data layer.
4. **C's cost is not the code, it is the tail** — signing, updates, three
   platforms, support — carried by an unfunded project. Reach it by packaging B
   once B is proven.

The unresolved risk in this recommendation is that **B still requires installing
something**, which fails on a locked-down school laptop. If the answers to §5 of
`adoption-risks.md` say school machines are locked, B does not solve adoption
either, and the honest options narrow to C via school IT, or D with everything
that entails.

**Do not decide this before asking the teacher those questions.** Choosing a
vehicle from assumptions is how the project ends up with a second thing nobody
can run.

### On the folder-of-files desktop app

The Obsidian comparison does not transfer, and it is worth saying why. Obsidian
works because the notes are useful *without* any model, and because its users are
already notes people. Rampa's files are machinery: a recipe is useless to a
teacher who is not running the pipeline. Exposing the folder therefore gives the
teacher nothing and frightens them.

This resolves the tension in the original objection — that an app is harder for a
non-developer to modify. **Teachers should not modify it.** Contributors modify
recipes in the repository; the app ships them read-only with an update button.
Two audiences, two interfaces, one corpus. House style and memory get proper UI
rather than being files the teacher is expected to edit.

### The unsigned-app tax

If C is ever built: an unsigned desktop app shows "Windows protected your PC" and
is blocked by macOS Gatekeeper. Signing certificates are an annual cost, in the
low hundreds. For a non-technical first-time user, an OS security warning is a
worse first impression than any missing feature — and this project gets one first
impression.

## Consequences if accepted

- Phase 0 continues on the harness, unchanged. Validation of adaptation quality
  does not depend on the vehicle.
- The README stops presenting the harness as the way teachers will use this, and
  says plainly who it is for today.
- The redaction guarantee is specified against B, and the README stops implying a
  protection A cannot deliver.
- `profiles/` moves to the per-learner directory layout with a roster, per
  `adoption-risks.md` §2, since both vehicles need it.

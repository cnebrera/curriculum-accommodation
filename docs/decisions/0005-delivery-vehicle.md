# 0005 — Delivery vehicle: who can actually run this

**Status:** Accepted · 2026-08-27

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

## Decision

**Build C: a desktop application over an open memory vault, with the teacher's
own key. Specified in [`specs/006-desktop-app/spec.md`](../../specs/006-desktop-app/spec.md).**

A stays the contributor path and keeps working against the same vault. E remains
available as a zero-build fallback if the application slips, but it is not the
plan.

The token is not a reason to avoid C — see the section above. The reasons to
choose C are that it is the only option that can keep the name-redaction promise,
and the only one where the teacher's records are hers rather than trapped in a
provider's project.

**The validating user has never used AI and will be unassisted.** That is written
into `006` as the pass/fail criterion, not as context: onboarding is the part
most likely to fail, so it is specified first and hardest.

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

### Two layers, two treatments — the Obsidian model applies to one of them

An earlier draft of this ADR rejected the Obsidian comparison. That was wrong,
because it applied one answer to two different things.

| Layer | What it is | Treatment |
|---|---|---|
| **Corpus** — recipes, instructions, templates | Machinery. Useless to a teacher not running the pipeline | Read-only, shipped with the vehicle, updated by a button. Contributors change it in the repository |
| **Memory** — learners, notes, house style | **The teacher's own notes.** Useful without any model | **An open folder of markdown the teacher owns.** Obsidian-compatible |

The test that separates them is exactly the one that makes Obsidian work: *is the
file worth anything without the model?* A recipe is not. A teacher's notes on a
learner are — they are the professional record they already keep in a notebook,
and they keep their value if this project disappears tomorrow.

So the memory vault is **Obsidian-compatible, not Obsidian-required**: plain
markdown in a folder, one file per learner plus a house-style file. If the teacher
uses Obsidian, they get search, backlinks, mobile and sync for free and we build
none of it. If they use Notepad, it still works. If they use nothing, the vehicle
provides the UI.

Two consequences for the format:

1. **The files must be prose-first and damage-tolerant.** A teacher will edit them
   by hand — that is the point — so brittle YAML that breaks the pipeline on a
   stray indent is a defect. Structure should be light, and the agent should
   repair and normalise rather than reject.
2. **Handover becomes shipping a folder**, which is what `004-handover` wanted
   anyway.

This also resolves the original objection — that an app is harder for a
non-developer to modify — by scoping it correctly. Teachers do not modify the
corpus; they modify their own vault, and that is theirs to break.

### On the token barrier

An earlier draft of this ADR treated needing an API key as close to
disqualifying. That was overstated, and the objection is fair: card-free routes
to a key exist (Google AI Studio's free tier being the obvious one), aggregators
offer free tiers, and plenty of non-technical people paste keys into tools every
day.

What survives is narrower and still true: **the key step is the single biggest
drop-off point in any bring-your-own-key onboarding**, not because it is hard but
because none of the vocabulary is familiar. "Create an API key" is five unfamiliar
words before anything works.

That makes it a design problem, not a reason to avoid the vehicle. The mitigation
is a good onboarding flow: deep-link to the exact page, show what the screen looks
like, one paste box, and immediate validation that answers the question the
teacher is actually asking — *is it working, and what will this cost me?*
Something like: **"✓ Connected. About 3 cents per worksheet."**

Do that well and the token stops being the reason this fails.

### The unsigned-app tax

If C is ever built: an unsigned desktop app shows "Windows protected your PC" and
is blocked by macOS Gatekeeper. Signing certificates are an annual cost, in the
low hundreds. For a non-technical first-time user, an OS security warning is a
worse first impression than any missing feature — and this project gets one first
impression.

## Consequences

- Phase 0's adaptation-quality question is now answered *through* the app, by a
  cold teacher, rather than separately on the harness. One validation, two
  questions: is the adaptation good, and can she get to it alone.
- The README stops presenting the harness as the way teachers will use this, and
  says plainly who it is for today.
- The redaction guarantee is specified against B, and the README stops implying a
  protection A cannot deliver.
- `profiles/` moves to the per-learner directory layout with a roster, per
  `adoption-risks.md` §2, since both vehicles need it.

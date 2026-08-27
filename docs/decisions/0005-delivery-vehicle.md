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

## Options

| | Reach | Name redaction | Recipes editable | Cost to build |
|---|---|---|---|---|
| **A · Harness only** (today) | Developers, assisted teachers | No | Yes | Done |
| **B · Local web app** over the harness | Teachers who can install and run one command | Yes | Yes, same folder | Medium |
| **C · Desktop app** (Tauri/Electron) | Teachers who can install software | Yes | Only if deliberately designed for it | High, plus signing, updates, three platforms |
| **D · Hosted service** | Everyone | Yes | No | High, ongoing, and it is the SaaS the project rejected |

D is out: it breaks the local-data promise and recreates what the project was
founded against.

## Recommendation

**Keep A as the reference implementation and the contributor path. Build B as the
adoption vehicle. Treat C as a later packaging of B, not a different product.**

Reasoning:

1. **The corpus is the project; the vehicle is not.** Recipes, the IR and the
   memory contract are the artifact worth defending. Vehicles are replaceable, so
   pick the cheapest one that reaches teachers.
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

## Consequences if accepted

- Phase 0 continues on the harness, unchanged. Validation of adaptation quality
  does not depend on the vehicle.
- The README stops presenting the harness as the way teachers will use this, and
  says plainly who it is for today.
- The redaction guarantee is specified against B, and the README stops implying a
  protection A cannot deliver.
- `profiles/` moves to the per-learner directory layout with a roster, per
  `adoption-risks.md` §2, since both vehicles need it.

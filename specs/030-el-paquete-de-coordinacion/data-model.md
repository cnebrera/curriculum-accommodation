# Data model

Two types in memory, three small marks on disk, and **no registry, no database, no sync
state**. A packet is a file; what the vault remembers about it is written where the
affected thing already lives.

## `CoordinationPacket` — the file, parsed

```ts
export type PacketKind = 'coordination' | 'review-request' | 'review';

export interface CoordinationPacket {
  kind: PacketKind;
  /** The sender's learner code. Opaque here by design — see the link rule. */
  code: string;
  /** A claim, never authenticated: 'PT', 'tutor', … Displayed as «dice ser <rol>». */
  role: string;
  academicYear: string;          // reuses 004's isStale rule on import
  period: { from: string; to: string };
  createdAt: string;
  items: PacketItem[];
  /** Only in 'review-request': the draft travelling for a second look. */
  draft?: { job: string; revision: number; fingerprint: string; document: string; report: string };
  /** Only in 'review': corrections coming back. */
  review?: { job: string; revision: number; fingerprint: string; corrections: string[] };
}

export type PacketItem =
  | { of: 'note'; date: string; heading: string; text: string }
  | { of: 'material'; date: string; title: string; signed: boolean }
  | { of: 'profile-delta'; date: string; text: string };   // «AUT = 2», «works: +…» — date real or '' (never fabricated)
```

### Rules

**Front matter is the machine's copy, the body is the person's — of the same items.**
The renderer writes both from one `CoordinationPacket`; the parser reads only the front
matter. There is no path where the two are built separately, which is what keeps the
audited text and the imported data from diverging.

**`role` is a claim.** Stored as given, displayed as claimed. No field for a name exists
on the type, so a name in a packet can only arrive through prose — which is what the
export gate (R6) checks bytes for.

**`date: ''` renders as «sin fecha».** Inherited verbatim from `handover.ts`'s longest
comment: an invented date on the field whose job is to say how old a claim is, is a lie
that reads like reassurance. P44 made annotation dates real going forward; old entries
without one say so.

## The provenance marker — on everything accepted

Not a new file: a mark written **into the destination** the accept already writes.

| Accepted item | Lands in | Carries |
|---|---|---|
| note | `profiles/<code>/notes.md` via `appendNote` | the note, then `→ recibido por paquete (<rol>, <fecha>)` |
| profile-delta | `profiles/<code>/profile.yaml` via `saveProfile` + a dated note | same marker in the note; the profile change itself is hers, chosen at the door |
| corrections (review) | `material/<job>/<learner>/second-look.md` | role, date, revision, fingerprint match/mismatch, packet filename, corrections |

**Every packet-derived claim is `reported`.** There is no parameter to say otherwise: the
importer does not accept an evidence marker from the file, because a packet asserting its
own credibility is the anchor `004` exists to avoid — and P44 just spent a review making
these markers honest. Asserted in test as an absence: no code path writes `observed` from
an import.

## `second_look` — the fact beside the signature

`job:signOff` today writes one block. It gains a second fact **when and only when**
`second-look.md` exists for the document being signed:

```yaml
review:
  signed_off: true
  by: "tutor"            # one person's signature (005 FR-512), unchanged
  date: "2026-09-10"
  second_look:           # a fact, not an approval
    by: "PT"             # the claimed role from the review packet
    date: "2026-09-08"
    revision: 3          # the revision the corrections were about
```

Rendered as «revisada por PT» beside the signature. **Nothing reads this to allow or
block anything** — no gate, per FR-2810 and the spec's own edge case. A sheet signed
with no second look simply has no `second_look` key, which is also a fact.

## On disk

```
handover/
├─ M7-2026-27.md                 004's packet, unchanged
├─ M7-coord-2026-10-14.md        coordination packet, exported (FR-2803: listed, erasable)
├─ M7-review-u4-r3.md            draft out for a second look
└─ received/
   └─ K2-coord-2026-10-15.md     held packet; front matter gains `linked: M7` on link
material/<job>/<learner>/
└─ second-look.md                imported corrections, recorded so they are not remade
```

## What deliberately gains no field

| | Why |
|---|---|
| A packet id / registry / «already imported» ledger | The vault has no state about other vaults. Re-importing shows the same items; skipping them again costs two clicks and keeps zero sync machinery. A ledger is the first step toward the merge this feature exists to not build |
| Sender identity beyond `role` | Authentication would be theatre (spec assumption); a name field would be a name in the bytes |
| `confirmation` lifecycle on imported items | That is `004`'s deferred receiving half (unconfirmed/confirmed/disconfirmed). The coordination door is accept/skip; grafting the year-boundary lifecycle onto weekly notes would make every Tuesday an audit |
| An `evidence` field the sender sets | See the provenance rule: `reported` is assigned by the receiver, structurally |
| A «last packet sent» pointer per learner | The period is chosen at export, defaulting from the newest `<code>-coord-*` filename already in `handover/` — the filesystem is the pointer, and `014` established stored copies of what the filesystem says as this project's most-repeated defect |
| Any write of the receiver's data into the packet | The link (`linked: M7`) annotates the **local copy** in `handover/received/`, never a file that travels back |

# Research — 018, pictograms

Four questions. The first one decides the architecture and was already answered by
the licence; the other three were open.

## R1 · Is this a recipe family at all?

**The spec calls it one.** The vision document put it in §6 beside the load and
language families, and G19 filed it as a recipe family. That framing is wrong, and
finding out why is most of this feature's design.

**A recipe is selected by an axis.** `selectRecipes(recipes, profile, lang,
present)` reads axis levels and returns what applies. FR-1605 says **no axis value
may enable pictograms** — so a pictogram recipe would be a recipe with no selection
criterion, which is a recipe that either never fires or fires always.

**And a recipe is prose for a model.** Every one of the ten shipped recipes is
judgement a model applies. Inserting a pictogram is not judgement: it is
`keyword → id → file`, which is Principle II territory and belongs in code. A
recipe telling a model «insert the pictogram for each key noun» would have the
model choosing pictures, which FR-1608 forbids in so many words.

**Decision: not a recipe. A deterministic transform over the IR, after adaptation,
gated on an explicit profile field.**

What that buys: the automatic-firing rule is structural rather than a review
convention. `selectRecipes` never sees pictograms, so there is no code path in
which an axis value enables them. What it costs: the judgement about *where*
pictograms help is not in the corpus, and it has to live somewhere — so it lives in
her `scope` choice (everywhere / instructions / key vocabulary), which is the
smallest honest surface for it.

## R2 · What is a "set", when nothing may depend on ARASAAC?

**Question.** FR-1604 says another set with equivalent metadata must work, and
FR-1601 means we cannot ship one to test against. So what exactly does Rampa read?

**Decision: a directory containing one metadata file that maps keywords to ids, and
image files named by id. Documented as a contract, tested against a fixture we
author ourselves.**

    <set>/
      pictograms.es.json     ← [{ "id": "2483", "keywords": ["rana", "sapo"] }, …]
      2483.png

**Why a keyword list per language rather than a single flat map**: a set legitimately
has several words for one picture, and the plural direction — one word, several
pictures — is the ambiguity FR-1609 turns into an omission. A flat
`{"rana": "2483"}` map cannot express either, so it would silently pick a winner.

**Why not read ARASAAC's own format directly**: we do not have it, cannot bundle a
sample, and writing a parser against a format from memory is how a feature ships
broken for the only set anybody uses. So the contract is documented, the
transformation from an ARASAAC download into it is **a page of instructions for
her**, and if that proves to be friction a real teacher will say so — at which
point we will have a real sample to write a parser against.

**A set with no metadata is not usable and Rampa says so.** From the spec's own
assumptions. Guessing from filenames is exactly the wrong-pictogram failure that
US3 exists to prevent.

## R3 · Where does the attribution go so it cannot be removed?

**Question.** FR-1603: every output containing a pictogram carries author, source
and licence, and no setting may remove it. The draft mark solved a similar problem
in `019` and its answer was «the first paragraph, not a page header».

**Decision: derived from the document, in the same function as the draft mark, and
rendered at the foot of the sheet rather than the head.**

Derived, because a parameter is a parameter somebody can pass `false` — which is
the defect `007` FR-509 found in `job:render`, where the renderer could ask for an
unmarked worksheet. `attributionFor(doc)` returns a line when the document contains
a pictogram and `null` when it does not, and there is no argument.

At the **foot** and not the head, unlike the draft mark: the draft mark's job is to
stop her handing the sheet out, so it must be the first thing seen. The attribution
is a legal requirement about a document that is otherwise fine, and putting it above
the child's first exercise costs him a line of attention for a reason that is not
about him.

**Rejected: a setting for where it goes.** Every setting on a licence condition is a
setting somebody sets to «off» and then distributes.

## R4 · Black and white, which is the delivery format

**Question.** SC-1605 wants a pictogram sheet legible in a black-and-white
photocopy, judged against a real photocopy. Nothing here can judge that. What can
be done before a person looks?

**Decision: the same treatment `006` FR-427's photocopy check already applies —
contrast asserted in code, plus a stated minimum print size — and the honest
admission that the rest needs a photocopier.**

A colour ARASAAC pictogram photocopied in greyscale loses the colour distinctions
its design uses (the verb/noun frame colours in particular). Two things follow:

- **A minimum rendered size**, because a pictogram at 12mm is a grey smudge at
  200 DPI whatever its contrast. 20mm as a starting point, in the corpus so it can
  move without a release.
- **Never colour alone**: a pictogram is always accompanied by its word. That is
  also FR-1614's text alternative doing double duty, and it is the same rule the
  axis strip follows.

**What research cannot settle**: whether the pictograms she actually has survive her
actual photocopier. Recorded as needing a person, like SC-1605 says.

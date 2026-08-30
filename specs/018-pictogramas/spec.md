# Feature Specification: Pictograms — the family we planned and never built

**Feature Branch**: `018-pictogramas`

**Created**: 2026-08-30

**Status**: Draft — needs `/speckit-clarify`, then `/speckit-plan`

**Input**: Backlog **G19** (filed as G16; renumbered 2026-08-30). The vision
document planned a visual-support and pictogram family in §6 and nothing since has
mentioned it. It carries two dimensions no other recipe family does: **inserting
image assets into output**, and **a licence**.

## The licence decides the architecture, so it comes first

ARASAAC is the set Spanish schools actually use. The pictograms are the property
of the **Gobierno de Aragón**, created by **Sergio Palao**, and distributed under
**CC BY-NC-SA**.

Rampa is Apache-2.0 for code and **CC BY-SA 4.0** for content. Two separate
problems, and neither is a technicality:

**NonCommercial.** Apache-2.0 permits commercial use; BY-NC-SA forbids it.
Bundling ARASAAC into the application would hand every downstream user a
restriction the rest of the licence says they do not have, and they would find out
by being wrong rather than by being told.

**ShareAlike, and it is the sharper one.** BY-SA and BY-NC-SA are not the same
licence, so ARASAAC content cannot be merged into our CC BY-SA corpus at all. And a
worksheet with a pictogram embedded in it is a derivative work: **the teacher's own
adapted sheet would become BY-NC-SA**, which is a condition on her material that
she did not choose and that Rampa would have imposed silently.

### The conclusion

**Rampa MUST NOT bundle or redistribute ARASAAC.** The teacher fetches the
pictogram set herself, on her own machine, under the licence she accepts directly;
Rampa reads it from where she put it. The backlog guessed at this — «local fetch by
the teacher may be the honest route» — and the licence confirms it.

That is not a workaround. It is the same shape as the API key: the relationship
with the third party is hers, Rampa is the thing that uses it, and we never stand
between her and terms she should read.

**And the attribution is not optional.** Every sheet carrying a pictogram must
print «Autor pictogramas: Sergio Palao · Origen: ARASAAC · Licencia CC BY-NC-SA».
It is a licence condition, it is exactly the kind of line a rendering pipeline
drops silently, and dropping it makes her sheet an infringement rather than ours.

## The pedagogical risk, which is bigger than the technical one

A pictogram next to every noun is not accessibility. For a learner who reads, it
**adds** load — one more thing on the page competing for the attention `ATE` and
`COG` are about. Recipes exist to reduce what is on a page; this is the one family
that adds to it.

And it is the most **visible** difference there is. A child in an aula ordinaria
holding a sheet covered in pictograms while thirty classmates hold a plain one is
being marked out by the tool meant to include them. A dyslexic fifteen-year-old
does not want a worksheet that looks like it is for a five-year-old, and would be
right.

So the design constraint that matters: **this family must never fire automatically
from an axis value.** Every other recipe can, because reducing load is safe when it
is unnecessary. This one is a decision about how a child is seen, and only the
teacher who knows the classroom can make it.

## What this is not

**Not an AAC system.** A communication board is a different product with different
users and different safety properties, and ARASAAC's own materials do it better.

**Not automatic illustration.** Rampa does not generate images, does not choose
pictures to decorate a text, and does not use a model to pick what a word looks
like. The pictogram set is a controlled vocabulary; matching a word to it is
deterministic lookup, which is Principle II territory and belongs in code.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - She brings the set, and Rampa uses it (Priority: P1)

She has downloaded the ARASAAC set, or her school has it on a shared drive. She
points Rampa at it once.

**Why this priority**: Nothing else works without it, and the licence means it can
work no other way.

**Independent Test**: With no set configured, the family is offered and explains
what it needs; with a set configured, pictograms appear.

**Acceptance Scenarios**:

1. **Given** no set, **When** she looks at the pictogram option, **Then** she is
   told what to download, from where, and under which licence — and Rampa does not
   download it for her.
2. **Given** a folder she chose, **Then** Rampa reads it and reports how many
   pictograms it found and in which language.
3. **Given** a set configured, **Then** its location and licence are recorded in
   the vault, so a colleague opening the folder knows what is required.
4. **Given** the set moves or is deleted, **Then** sheets that used it still render
   and say the image is missing, rather than failing.

---

### User Story 2 - She decides, per learner, that this helps (Priority: P1)

Pictograms are on for Iván because he is a pictogram user, and off for everyone
else, including learners whose axis values look similar.

**Why this priority**: It is the safeguard. See the pedagogical risk above.

**Acceptance Scenarios**:

1. **Given** any profile, **Then** no axis value alone ever enables pictograms.
2. **Given** a learner, **Then** she can turn the family on for them explicitly,
   and the profile records that she did.
3. **Given** it is on, **Then** she can say where: everywhere, on instructions
   only, or on key vocabulary only.
4. **Given** it is off, **Then** the report does not suggest it. A tool that keeps
   proposing pictograms is a tool arguing with her about how a child is seen.
5. **Given** an overlay (`017`) prescribing pictogram support, **Then** it enables
   the family, because that is a decision the team already made.

---

### User Story 3 - The right pictogram, or none (Priority: P1)

The word «rana» gets the pictogram for a frog, or it gets nothing.

**Why this priority**: A wrong pictogram is worse than no pictogram — it teaches
the wrong word to a learner who is reading the picture rather than the text, and
she may not notice because she reads the text.

**Acceptance Scenarios**:

1. **Given** a word with an unambiguous match, **Then** it is used.
2. **Given** a word with several candidate meanings, **Then** none is inserted and
   the report lists it as skipped, with the candidates, so she can choose.
3. **Given** matching, **Then** it is deterministic lookup against the set's own
   metadata. No model chooses a picture (Principle II).
4. **Given** a match, **Then** the provenance records which pictogram id was used,
   so a wrong one is traceable to a decision rather than to a mystery (Principle
   VI).
5. **Given** a learner's own vocabulary — her school uses a different picture for
   «recreo» — **Then** she can override a mapping, and her override wins.

---

### User Story 4 - It prints, and it is legal (Priority: P1)

The sheet comes out of the photocopier in black and white with the attribution on
it.

**Acceptance Scenarios**:

1. **Given** any output containing a pictogram, **Then** the attribution line is
   present — author, source, licence.
2. **Given** the attribution, **Then** it cannot be removed by any setting. It is a
   licence condition, not a preference.
3. **Given** a black-and-white photocopy (`006` FR-427), **Then** pictograms are
   still legible — this is the delivery format, not an edge case.
4. **Given** a PDF, **Then** images are embedded, so the sheet survives being
   emailed to a colleague without the set.
5. **Given** any pictogram, **Then** it carries a text alternative, because the
   same sheet may be read by a screen reader and a picture with no alt is a hole in
   the document (`010`'s conformance target applies to output too — backlog G7).

---

### Edge Cases

- **A word that is a name.** «Lucía» must never get a pictogram, and the name check
  (`009`) applies before matching.
- **A set in another language.** Matching is per language; an English set against
  Spanish material must find nothing rather than something wrong.
- **A worksheet already full of images.** Adding pictograms to a dense page is the
  opposite of the point; the family must interact with the load recipes rather than
  ignore them.
- **An exam** (`012`). A pictogram changes what a question asks if the question is
  about the word. This needs an explicit rule, not an assumption.
- **A 300-page ingest.** Lookup cost, and whether the render slows to the point she
  stops using it.
- **The set updated.** A pictogram id that no longer exists in a newer set.

## Requirements *(mandatory)*

### Licence

- **FR-1601**: Rampa MUST NOT bundle, redistribute or download ARASAAC pictograms.
  The set is fetched by the teacher, under terms she accepts directly.
- **FR-1602**: Rampa MUST tell her what the licence requires before she configures
  a set, including that a sheet containing pictograms is a derivative work under
  CC BY-NC-SA.
- **FR-1603**: Every output containing a pictogram MUST carry the attribution, and
  no setting may remove it.
- **FR-1604**: The pictogram set MUST be replaceable. Nothing in code may assume
  ARASAAC specifically; another set with equivalent metadata must work.

### The decision is hers

- **FR-1605**: No axis value MAY enable this family. It is enabled per learner, by
  her, or by an overlay (`017`).
- **FR-1606**: The profile MUST record that she enabled it, and the scope she chose.
- **FR-1607**: Where it is off, the report MUST NOT propose it.

### Matching

- **FR-1608**: Matching MUST be deterministic lookup against the set's metadata. No
  model chooses an image (Principle II).
- **FR-1609**: An ambiguous word MUST get no pictogram, and MUST be reported as
  skipped with its candidates.
- **FR-1610**: A learner's name MUST never be matched (`009`).
- **FR-1611**: Provenance MUST record the pictogram id used (Principle VI).
- **FR-1612**: She MUST be able to override a mapping, and her override wins.

### Output

- **FR-1613**: Pictograms MUST remain legible in black-and-white photocopy
  (`006` FR-427).
- **FR-1614**: Every pictogram MUST carry a text alternative.
- **FR-1615**: Images MUST be embedded in exported documents, so a sheet survives
  leaving the machine that has the set.
- **FR-1616**: A missing image MUST degrade to a named gap in the rendered sheet,
  never to a failed render.

## Success Criteria *(mandatory)*

- **SC-1601**: The repository contains no ARASAAC asset, and a licence check
  asserts it.
- **SC-1602**: No sheet containing a pictogram exists without its attribution.
- **SC-1603**: No profile enables pictograms without a recorded human decision.
- **SC-1604**: Over a fixture set, zero wrong pictograms — ambiguity produces
  omission, and omission is reported.
- **SC-1605**: A pictogram sheet photocopied in black and white is readable, judged
  against a real photocopy.
- **SC-1606**: A PT who uses pictograms says the sheets are usable, and — the one
  that matters — a PT who does *not* use them says Rampa never pushed her toward
  them.

## Assumptions

- ARASAAC is the set to design against because it is the one Spanish schools have,
  but FR-1604 means nothing depends on it.
- Matching is against the set's own metadata; if a set ships none, that set is not
  usable and Rampa says so rather than guessing.
- This family is a candidate for the community's first contributions, as G19 says —
  but the licence and the automatic-firing rule are not community decisions.

## Dependencies

- `017` for an overlay that prescribes pictogram support.
- `019` for the text alternative, which is the same field a braille or audio
  rendering needs.
- Backlog G7 — the output's own accessibility target — becomes load-bearing here:
  a document with images has an accessibility contract a document of text does not.

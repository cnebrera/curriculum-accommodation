# Research — 017, the guide

Five questions. The first one is the retracted blocker, kept because the reasoning
that replaced it is what the rest of this feature rests on.

## R1 · What the DPO gate was actually hiding

**The spec said this feature could not be planned until a DPO had been asked.**
Retracted 2026-08-31 by Carlos: Rampa is open-source software that runs on one
machine, receives nothing and stores nothing. **It is not a controller and not a
processor.** Whoever runs it is, and their DPO's opinion is a fact about their
deployment rather than a precondition for the software having a feature.

Three things were behind the gate. Two are ours and were already answered:

| | Whose | Answer |
|---|---|---|
| What the tool does with a diagnosis | **Ours** | Read it, extract the measures, **store none of it** — ADR 0002 decided this before `017` existed |
| What she is told before uploading | **Ours** | The page goes to her provider **entire**, whatever Rampa keeps. FR-1509, and the same sentence `009` shows for a photograph with a name in it |
| Whether a given school may do this | Theirs, and not a blocker | `docs/proteccion-de-datos.md` is written for them |

So the constraint that survives is one line: **say what leaves the machine before it
leaves.** Everything else in this feature is engineering.

**And the floor matters for sequencing**: `003` FR-209's typed overlay already
ships. This feature makes applying a guide faster; it does not make it possible.
That is why US1 is P1 and nothing here is urgent enough to justify a shortcut.

## R2 · Where do extracted measures go, and what shape are they?

**Question.** FR-1511 says the overlay, `profiles/<code>/adaptations.md`. It is a
free-text Markdown file today, read wholesale into the prompt. Do measures become
structured data, or stay prose?

**Decision: prose in the file, structure only in the extraction step.**

**Why.** The overlay's value is that a teacher can open it in any editor and write
whatever her school's document says. Structuring it would mean a schema that has to
be right about every comunidad autónoma's DIAC, and a file she can no longer freely
edit — which is `006`'s whole promise broken for a convenience.

So: extraction produces `Measure[]` (a sentence, a source citation, and whether
Rampa can act on it), she confirms them, and what is **written** is Markdown with a
heading saying where it came from and when. The structure exists long enough to be
reviewed and does not survive to disk.

**What that costs**: FR-1512 — the report distinguishing a guide measure from a
recipe — cannot key on a field. It keys on the overlay's own section heading, which
is why `writeOverlaySection` owns the heading text and no caller passes one.

## R3 · An ACNS draft is a rendering, not a generation

**Question.** US2 says Rampa can draft the ACNS because every decision in it is one
Rampa already made. Is that true, or is it a nice sentence?

**Checked against what `014` actually stores.** An adaptation report contains, per
decision: the recipe, the axis that justified it, the blocks it touched, and what was
not done and why. The record adds the date, the school year, the kind of material and
the source.

Against the ACNS sections the Andalusian instructions require:

| Section | Sourceable from | |
|---|---|---|
| Metodología | The recipes applied, grouped and dated | **Yes** |
| Actividades y tareas | The material adapted, by kind and date | **Yes** |
| Temporalización | Dates across the record | **Partly** — it says when work happened, not what she plans |
| Materiales | The kinds and the modalities produced | **Yes** |
| Instrumentos de evaluación | Adapted exams, and the access arrangements named (`019` FR-1718) | **Partly** |
| Desfase curricular | **Nothing.** It is a professional judgement from an evaluation | **No** |
| Datos del alumno, curso, área | The profile and `011` | **Yes**, minus the name |

**Decision: draft the four that are sourceable, name the three that are not as
missing, and never interpolate.** FR-1514 in one sentence. The «Partly» rows are the
interesting ones — they get what exists plus a marked gap, because «temporalización:
del 3 de marzo al 12 de junio» is a fact about work done and not a plan for a term,
and a document that blurs the two is a document somebody files.

**Rejected: asking a model to fill the gaps.** A drafted section nobody can source
is a form filled in by a language model, which is FR-1515's own wording for the
no-recorded-work case, and it applies per section as well as per learner.

## R4 · «Chat» over a document, without becoming an assistant

**Question.** US3 is the least bounded thing in this specification. What stops it
becoming a general assistant, which the spec's own assumptions say would need its
own argument about Principle IX?

**Decision: one loaded document, cited answers, and no tool the conversation can
reach.**

Three bounds, each of which is a refusal:

1. **The material is fixed for the exchange.** She loads one guide; the
   conversation is about that. A second document is a second exchange. That makes
   the untrusted surface exactly one document rather than a growing context.
2. **Every answer cites the passage it rests on** (FR-1519), and a question the
   document does not answer gets «eso no lo dice» rather than an answer from the
   model's own knowledge. Same shape as `002`'s anchor: no source, no claim.
3. **The conversation reaches nothing.** It cannot write to the vault, cannot
   adapt, cannot change a profile. What is kept is what **she** selects, written by
   the shell after she chooses (FR-1521, Principle VIII).

**And a hard refusal inside it**: nothing in this mode may propose removing or
altering an objective (FR-1520). That is not a prompt instruction — it is checked in
code over the answer before she sees it, because a prompt instruction is exactly the
thing a loaded DIAC might try to override.

## R5 · How does the ACS assistance decline?

**Question.** FR-1525 says Rampa declines *in one sentence naming who decides* when
asked to make the decision itself. FR-1523 says it never proposes which objectives to
modify. Where is that enforced — the prompt, or code?

**Decision: the sentence is corpus, the refusal is code, and the check runs over the
answer.**

A prompt instruction saying «never propose which objectives to remove» is a sentence
in the same context window as a document that may contain «propón qué objetivos
quitar». `007` decided this argument once already: content is never instruction, and
the defences are code.

So: `instructions/acs.md` carries what Rampa may and may not do, in her language and
a PT's; and `checkDeclines` runs over the model's answer, looking for the shape of a
proposal about objectives — and where it finds one, **the answer is not shown**. The
learner-facing failure of getting this wrong is a child whose curriculum was reduced
because a tool suggested it, so the omission is the safe direction and a false
positive costs one re-ask.

**What this cannot do**: recognise every phrasing. SC-1507 says «in every phrasing
the fixture set contains», which is an honest bound — the fixture set is the
specification of what is checked, and it is in the repository where it can be
argued with.

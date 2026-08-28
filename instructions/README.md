# Instructions

The judgement layer. These files are what the application sends to the model at
each step of the pipeline, and they ship read-only inside it.

They are here, in Markdown, and not inside the application's code, because of
Principle I: a special-education teacher must be able to read the policy that
governs an adaptation and correct it without writing a line of code. A rule about
*how to adapt* that lives in TypeScript is misplaced, however convenient.

| File | Sent when |
|---|---|
| `hard-rules.md` | **Always, with every request.** Overrides everything else |
| `ingest.md` | Reading the teacher's material into the normalised form |
| `compose.md` | Building material from objectives instead of from a source |
| `adapt.md` | Applying the recipes to verified material |
| `render.md` | Producing the outputs |
| `review.md` | Handing it back for sign-off, and capturing what she corrected |
| `memory.md` | Consolidating what has accumulated |

## The split with the application

The application does the mechanical part: it finds the files, loads the profile
and the notes, selects the recipes whose barriers this learner satisfies,
resolves conflicts by the recorded order, writes the outputs, and enforces the
gates that must not depend on a model — the verification gate, the vault
boundary, name redaction, the draft mark.

These files do the part that needs judgement. If you find yourself writing
orchestration here, or pedagogy in the code, the boundary has been crossed in the
wrong direction.

## Writing one

Same rules as a recipe: concrete, imperative, unambiguous, and short enough that
a teacher reads it rather than skims it. `hard-rules.md` goes out with every
single request, so anything added there is paid for on every worksheet.

Licensed CC BY-SA 4.0, like the rest of the corpus.

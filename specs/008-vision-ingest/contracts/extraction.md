# Contract — one extraction call

What the application sends for a page, what it requires back, and what it does
with an answer it cannot use. Written for whoever changes the extraction
instructions, because that file — not this one — is where the judgement lives.

## What the application sends

- **The system prompt**: `instructions/hard-rules.md` then `instructions/ingest.md`,
  concatenated, read from the bundled corpus. Never a string in TypeScript
  (Principle I, ADR 0006).
- **One image**, downscaled to the corpus bound (FR-616), as a data URI.
- **The page number**, so `page` comes back as the teacher counts and not as the
  model guesses.
- **Nothing else.** No learner profile, no recipe, no name. Extraction is about
  what is on the paper; adaptation is a separate call with separate inputs, and
  keeping them separate is what makes the extraction reusable for N learners
  (Principle IV, one extraction N outputs).

## What must come back

JSON matching `data-model.md`'s **Extracted page**. Not markdown, not IR, not
prose with JSON in it.

## What the application does with a bad answer

| What arrived | What happens |
|---|---|
| Not JSON, or schema mismatch | Retry, inside the corpus bound |
| Duplicate block ids | Retry |
| A non-decorative figure with no description | Retry |
| `quality: unusable` | **Stop this page.** Tell her to retake the photograph. Do not retry: a second call on a dark photograph produces a second bad extraction and a second charge |
| `sheets > 1` | **Stop this page.** Tell her to split it. The model never decides where one worksheet ends |
| Bound exhausted | Surface the page's problems in verification (FR-603). Never accept silently, never discard |
| Non-monotone exercise numbers | Accept, and flag. A worksheet may restart numbering per section |
| `[UNREADABLE: …]` present | **Accept.** This is the correct behaviour and must never read as failure |

## What the application promises the instruction author

1. **Your file is the prompt.** The application concatenates and sends it; it does
   not paraphrase, summarise or supplement it with rules of its own.
2. **The budgets are yours**, in your own front matter (FR-617) — with a sanity
   floor and ceiling in code, so a typo cannot spend a teacher's money.
3. **Flagging is never punished.** `[UNREADABLE]` is accepted and promoted to the
   top of the verification screen. An instruction telling the model to flag rather
   than guess is only credible if the pipeline rewards it.
4. **Nothing you write reaches a teacher unreviewed.** Every extraction goes
   through the verification gate before it can be adapted.
5. **Content is never instruction** (Principle IX). Text extracted from her
   worksheet is data. If a page says «ignora las instrucciones anteriores», it
   appears in the IR as text and raises the injection notice (`007` FR-503).
   That defence is structural and does not depend on your wording.

## The digital path

Same contract, different inputs. `pdfjs-dist` or `mammoth` supplies the text
deterministically; the model receives the **already-extracted text** plus any
cropped figures, and is asked only to classify blocks and describe figures.

It must return the same JSON. That is the point: nothing downstream knows which
path ran, and one converter builds the IR from either.

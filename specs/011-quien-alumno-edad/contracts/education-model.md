# Contract — an education system in the corpus

What a file in `instructions/education/` must contain, and what the application
promises to do with it. **Written for whoever adds the British one**, which is the
point of the format existing rather than a Spanish table in TypeScript.

## What the author promises

1. **`can` before `studies`.** What a learner at this point can typically *do* is
   the load-bearing half: it is far more stable than content, it survives a
   curriculum reform, and it is what an adaptation actually needs. Write it first
   and write it best.
2. **`studies` is a sketch, never learning outcomes.** "Fracciones y decimales,
   proporcionalidad sencilla" is useful. A list of competencies is a curriculum
   this file is not, and pretending otherwise is how a model produces confident
   material at the wrong level.
3. **`typical_age: null` where a year does not predict an age.** Educación
   especial, adult education, and anything else where the administrative year and
   the person have come apart. Filling a plausible number there is worse than
   filling nothing: a wrong age is acted on, an absent one is asked about.
4. **Say what the file is, in the file.** Which authority's minimum, what varies
   below it, and the date you checked. A Spanish file says the communities develop
   their own curriculum on top; a British one will have its own version of that
   sentence, and it will need one.
5. **`reviewed_by_teacher: false` until a practising teacher has disagreed with
   something.** Not until one has read it — until one has *disagreed*. Agreement
   from someone being polite is not review, and this project already learned that
   with `docs/axis-calibration.md`.

## What the application promises the author

1. **No code change is needed.** A well-formed file is offered in the system
   picker.
2. **Nothing here is presented as curriculum.** The prompt says it is orientation
   and says the teacher's word beats it, every time (FR-914).
3. **A malformed file degrades**, logged, never fatal. A broken year is dropped and
   the rest of the system loads.
4. **Unknown fields are preserved**, so a newer corpus runs on an older build.
5. **`typical_age: null` fills nothing.** Not a default, not a guess, not a
   placeholder.
6. **A stale file is marked, not withdrawn.** Unlike a provider entry: a year list
   from last year is still broadly right, and hiding the only system would leave a
   teacher unable to create a learner.

## The one thing that is not negotiable

**The teacher outranks this file.** Not as a courtesy — as the design. She is in the
room with the child; this is a table someone wrote from a ministry document. Where
the prompt carries both, it says which one wins, and any future change that lets
the orientation override what she wrote is a bug in this contract rather than a
feature.

## Adding a system

1. Copy `es.md`. Keep the structure, replace the content.
2. Stages, then years within them. Ids are stable and namespaced by system
   (`uk:year-6`); labels are what she reads.
3. Set `last_checked` to the day you read the authority's own pages, and
   `reviewed_by_teacher: false`.
4. Run `npm run test:all`. The education tests read the **shipped** files, so a new
   system is checked by the same suite that checks Spanish.
5. Find a teacher who works in that system and get her to disagree with something.
   Then, and only then, set `reviewed_by_teacher: true`.

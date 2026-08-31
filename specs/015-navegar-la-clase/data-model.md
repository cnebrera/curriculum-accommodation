# Data model: navigating a caseload

## One new field

```yaml
# profiles/<code>/profile.yaml
school: "CEIP Las Encinas"     # optional, free text
```

**Optional**, because a teacher in one school never needs it. **Free text**,
because a taxonomy of Spanish schools is a project of its own and would be wrong
the week it shipped.

### It joins the never-sent set

`school` goes with the learner's name: never in a prompt, never in an export,
never in a log. It is not needed for any adaptation — and a school plus a course
plus a set of barriers identifies a child far more sharply than a code does.

It appears in the erasure plan and is erased with the learner (`003`, `014`).

## Everything else is derived

| filter | derived from |
|---|---|
| course, stage | the profile (`011`) |
| school | the profile |
| school year | the **work** (`014`'s record), not the profile |
| «has she made anything» | the record |
| name | the encrypted map, resolved in memory, never stored (`014` FR-1207) |

The school-year filter using the *work's* year rather than the profile's current
course is the one that matters: a learner who changed course between years must
still be findable under last year's work.

## What is NOT added

**No `group`, no `class`, no saved filter, no "recently viewed".** Each is a
second piece of state about her caseload that would then have to be kept true
through erasure, through a course change, and through a hand-edit in Obsidian.

**No sort key.** The filter returns rows in a stable order and takes no ordering
argument. That is the structural half of Principle V here: a view cannot sort by
an axis because nothing in the data path accepts an axis to sort by.

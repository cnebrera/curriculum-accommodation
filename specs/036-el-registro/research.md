# Phase 0 · Research

## R1 · Is «the log never contains a learner's name» enforced or intended?

**Decision: enforced, at one chokepoint — and the plan still tests it over a real session.**

`sanitise()` runs inside `Logger.log`, so every call site goes through it whatever it
passes:

- A **forbidden-key list** — `name|nombre|content|contenido|text|texto|body|payload|`
  `prompt|material|quote|source` — replaced by `[omitido]`.
- **Length as a proxy for material**: any string over 120 characters becomes
  `[N caracteres]`. «Long free text is material until proven otherwise» is the comment,
  and it is the right default.
- Anything not a primitive is stringified and cut at 60.

**Rationale for testing anyway**: the list is structural for the keys it knows and
advisory for the ones it does not. `logger.info('x', { child: 'Lucía' })` is five
characters under an unlisted key and would be written. There are 114 call sites, so the
question is not «is the sanitiser good» but «did any of them slip». That is a test over a
real session, not a review of a regular expression.

**Alternatives considered**: extend the key list with `learner`, `child`, `alumno`,
`code`. Rejected for now, and the reason is precise — **codes are deliberately allowed**
(«codes, error kinds, counts, durations and file paths relative to the vault»), because a
code is the pseudonym and is the only way a log line can say *which* job. Adding `code` to
the forbidden list would blind the diagnostic to the one identifier it is allowed to have.
`learner` and `child` are worth adding, but that is a change to the logger, which FR-3414
puts out of scope — recorded here so it arrives as its own decision.

## R2 · Where does the section live?

**Decision: inside «Acerca de y licencias», as its own component.**

`025` FR-2307 moved that screen into Configuración unchanged, and it already holds the
things that are facts about her installation rather than about a child: the version, the
licences, the update consent, the declared destinations. The log is another one.

**Alternatives considered**: its own top-level entry — contradicts `020` FR-1802, which is
exactly two destinations and was deferred for two specifications before landing. A section
inside Configuración beside «Acerca de» — a seventh pane for one paragraph and three
controls, when the subject is already what «Acerca de» is about.

## R3 · How much of the file, and how?

**Decision: the last 200 lines, through the channel that already does it.**

`diagnostics:tail` takes a line count and defaults to 200. A line is ~100 bytes, so 200
lines is ~20 KB — enough to hold an unhandled failure and the events around it, small
enough to read, and it does not depend on the file's size.

**Alternatives considered**: the whole file (2 MB into a React tree on the machine that is
already misbehaving — the worst possible moment for that), or a byte count instead of a
line count (a tail that starts mid-line is a tail whose first entry is a fragment).

## R4 · The clipboard, and whether it is a destination

**Decision: `navigator.clipboard.writeText`, and it is not a destination.**

Carlos asked for copy (clarified 2026-09-07) and it is what she will actually do: paste
into an email. The declared-destinations list (`034` FR-3204) is about hosts the
application connects to; a clipboard is neither a host nor a connection. It does not leave
her machine — what she does with it afterwards is hers, which is the same boundary as
«open the folder so she can attach the file».

**What the decision does carry**: what reaches the clipboard is the same text that is on
the screen, so FR-3410 governs both. Copying a *rendered* version — with markup, links or
styling that a document fragment talked its way into — would be Principle IX broken at the
one point where nobody would look.

**Alternatives considered**: no copy, folder only (Carlos asked; and «attach a file» is
more steps than «paste» for the thing she is actually doing). A «send to us» button —
refused by FR-3411 and out of scope: nothing leaves her computer except to the provider
she chose.

## R5 · What happens when there is nothing, or it cannot be read

**Decision: three distinct answers, because they are three different facts.**

| State | What she is told |
|---|---|
| No log yet | «Todavía no hay nada apuntado» — said, not an empty box |
| Read failed | «No he podido leerlo», and where it is, so she can look herself |
| Empty tail of an existing file | The same as «nothing yet», because to her they are the same |

**Rationale**: an empty box is the shape of a rendering fault, and this screen exists for
the moment when she already suspects something is broken. `008`'s verification screen
learned this the hard way — «an extraction that could not be read and one that does not
exist rendered the same "Un momento…" for ever, which is the loading state lying about a
dead screen».

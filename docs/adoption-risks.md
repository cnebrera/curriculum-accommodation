# Adoption risks, from the teacher's side

An adversarial look at the project from the point of view of the person it is
supposedly for. Written 2026-08-27, before Phase 0.

Everything specified so far assumes the design works. This asks a different
question: **who can actually use it, and what stops them?**

---

## 1 · We have been designing for the wrong user

The harness model is "clone the repository, open the folder with your AI agent,
run `/rampa-adapt`". Read that as a special-education teacher.

- Clone a git repository.
- Know what a working directory is.
- Run a setup script from a terminal.
- Understand a directory structure, and which folders are theirs.
- Know what is saved where, and what to back up.

None of that is unreasonable to ask of a developer. All of it is unreasonable to
ask of the audience this project exists for.

**And the deeper problem is not git.** The harness assumes the teacher has an
*agentic, filesystem-capable* AI tool — Claude Code, Gemini CLI, Codex. Those are
developer tools. A teacher who pays for an AI subscription has the **chat app**,
which cannot read a folder, cannot run a script, and cannot save a file where we
expect it.

So the honest reading of the current design's reach:

| Who | Can they use it today? |
|---|---|
| A developer | Yes |
| A technically confident teacher, on their own laptop | Probably, with help the first time |
| A teacher working next to someone technical | Yes — and this is a real deployment model, not a cop-out |
| A teacher with only a chat subscription | No |
| A teacher on a locked-down school laptop with no install rights | No |
| The community of teachers this project is for | **No** |

This does not invalidate the harness. It means the harness is the **reference
implementation and the contributor path**, not the adoption vehicle. Continuing
to describe it as the adoption vehicle would be the project lying to itself.

See [ADR 0005](decisions/0005-delivery-vehicle.md) for the options and the
recommendation.

---

## 2 · Where the learner sits

`profiles/A3.yaml` is flat. A real teacher has fifteen to thirty learners, across
several classes, sometimes across more than one school, and across years. Flat
files stop working in week two.

### The trap

**Organisational context is itself identifying.** School + year + class + one
learner with a profile, in a small school with a single Year 5 group, identifies a
child as surely as a name does. So the structure cannot simply be folders named
after the school and the class.

### Proposed structure

```
profiles/
├─ roster.yaml            ← the only file with organisational context
├─ A3/
│  ├─ profile.yaml
│  ├─ notes.md
│  └─ adaptations.md
└─ archive/
   └─ 2025-26/            ← closed academic years, retention clock running
```

`roster.yaml` carries context, never identity:

```yaml
academic_year: "2026-27"
setting: "centro-1"          # the teacher's own alias, not the school's name
learners:
  - code: A3
    stage: primaria
    year_group: "5"
    group: "B"
    subjects: [lengua, naturales]
    status: active           # active | archived | forgotten
```

Three rules that follow:

1. **The code is generated, never chosen.** A teacher left to invent codes will
   use initials — `LG` for Lucía García — because it is the obvious thing to do.
   Initials are identifying. The system must issue opaque codes.
2. **The school is an alias.** `centro-1`, not the school's name. The teacher
   knows which is which; a leaked folder does not.
3. **Academic year is structural, not a field**, because it is what drives
   archiving, retention and handover. A closed year moves to `archive/<year>/`
   and starts the retention clock specified in `003-memory`.

---

## 3 · Keeping the name out of the prompt

The question was: how do we guarantee a learner's name never reaches a model?

**With the current design, we cannot.** This needs saying plainly, because the
README currently implies a protection the architecture does not deliver.

Our files carry no names. That is real, and it is enforced. But the leak is not
the files — **it is the teacher talking**. They will type:

> *Lucía no arranca si no le dejas el primer paso hecho.*

And the name is in the prompt, on its way to the provider, before any of our
rules apply. Every safeguard we wrote governs what the agent *writes down*. None
governs what the human *types*.

What each vehicle can actually promise:

| Vehicle | Guarantee |
|---|---|
| Harness + agent CLI | **None.** We can ask the agent not to record the name. We cannot stop the teacher sending it |
| Local web app or desktop app | **Enforceable.** The app can redact before sending |

The mechanism, for the app vehicles, is a useful inversion: **store the name
locally, encrypted, precisely so that it can be stripped.** The app knows
`A3 = Lucía`, shows "Lucía" in the interface because that is how a teacher
thinks, and substitutes the code on every outbound request. The name lives in the
UI layer and never in the data layer, never in a file, never in a prompt.

Until such a vehicle exists, the honest statement is: *profiles contain no
identity, and you should avoid typing names in conversation — but nothing
prevents it.* The README must say that instead of implying otherwise.

---

## 4 · Other things that will stop a teacher using this

Ordered by how likely each is to end adoption on day one.

### 4.1 The first bad output ends it

One invented fact, one mangled exercise, and they never come back. There is no
second impression. This argues for the safeguards being tight before the tool is
easy — the opposite of the usual order — and for the first run being on material
we are confident about.

### 4.2 It has to fit in a free period

A teacher does this in a 45-minute gap, or on Sunday night. If one worksheet
takes more than about fifteen minutes end to end, it does not get used.

The mandatory human verification after ingest is the expensive step, and it is
the one we made non-negotiable. That tension is real and unresolved: it is a
safety step that costs adoption. It should be measured in Phase 0, not assumed
away.

### 4.3 The photocopier

Teachers print, in black and white, on the school copier. Our template is
parameterised by colour and contrast. Colour-coded structure collapses into
identical greys on a photocopy, and a "high contrast" version can come out worse
than the plain one.

Everything must be designed to survive a B/W A4 photocopy, and that should be a
render check, not an afterthought.

### 4.4 The material is not a file

Increasingly the source lives inside a publisher's digital platform with no
export. The teacher's real "file" is a photo of a screen or a screenshot. We
support photos, which is right — but it means the low-quality path is the
*common* path, not the fallback.

### 4.5 The vocabulary is ours, not theirs

"IR", "harness", "corpus", "axes", "ingest", "compose". A teacher says *ficha*,
*adaptación*, *informe*, *alumno*. Repository English is a defensible choice for
contributors; it is indefensible in the interface. The vehicle must speak the
teacher's language, and so must the commands.

### 4.6 Who pays for the model

A teacher does not have an API key, and may be on a free tier with rate limits
and a weaker model. If the school pays, that is procurement, a purchase order and
a data-protection review. We have not addressed this at all, and it is a hard
adoption gate.

### 4.7 Permission to use it

Many teachers will not touch an AI tool with student data without something they
can show the head teacher or the school's data protection officer. This is cheap
for us to fix and expensive for them to produce: a one-page plain-language
document stating what data is processed, where it goes, and what never leaves the
machine.

Its absence blocks careful, senior teachers first — exactly the ones whose
adoption would carry the most weight.

### 4.8 Fear of breaking it

Files, folders, a terminal, git. A teacher who is not sure what is safe to touch
will not touch anything. Whatever the vehicle, there must be no state a teacher
can destroy by accident, and no action without an obvious undo.

### 4.9 It lives beside the tools they already use

A PT already works in Additio, Alexia, Séneca or the regional equivalent. Another
disconnected silo is another thing to remember. We do not need integration in
Phase 0, but we should not design in a way that forecloses it.

### 4.10 Sharing with the tutor

Adapted material usually goes to the class tutor as well. There is no path for
that, and the draft watermark makes an informal share look unfinished. Worth
designing before teachers invent their own path around it.

---

## 5 · What to ask the teacher first

Before deciding the vehicle, these answers change the design:

1. Whose laptop — the school's or their own? Can they install software?
2. What do they already have: a paid AI subscription, and which one?
3. Where does the material actually come from today, in the last five things they
   adapted?
4. How many learners, across how many classes and how many schools?
5. When do they do this work, and how long do they have?
6. Would they need permission from the school to use it, and from whom?

These are cheap to ask and they invalidate or confirm most of this document.

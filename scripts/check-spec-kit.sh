#!/usr/bin/env bash
#
# The Spec Kit gate. Deterministic, offline, no model — Principle II.
#
# Why this exists as code and not as a reminder: the project's own doctrine says
# structural defences outrank instructional ones (Principle IX), and this rule
# has now been broken twice by someone who had read the reminder. The BACKLOG
# recorded it the first time as a "process gap"; the second time it was an agent
# writing a specification and starting to implement it in the same breath.
#
# What it can enforce: that specifying and implementing are not the same commit,
# and that the artifact chain is not left half-built. What it cannot enforce is
# that anyone *thought* — /speckit-clarify is a conversation, not a file. So the
# gate makes skipping visible and expensive, and AGENTS.md carries the rest.
#
# Usage:
#   scripts/check-spec-kit.sh                 # staged files (pre-commit)
#   scripts/check-spec-kit.sh <ref>           # files changed against a ref (CI)
#
# Override, for genuine exceptions such as fixing a typo in a specification:
#   RAMPA_SKIP_SPECKIT=1 git commit ...
set -uo pipefail

cd "$(git rev-parse --show-toplevel)"

# Anything that is the product rather than the plan.
#
# `scripts/` is NOT here on purpose: it is repository hygiene — this gate, the
# recipe validator, the hook installer — and not the thing a teacher uses.
# Including it was this script's first bug, found by the script blocking its own
# introducing commit, which is a reasonable way to be introduced.
IMPLEMENTATION='^(app|recipes|instructions|checklists)/'
SPEC_FILE='^specs/[^/]+/spec\.md$'

if [ $# -ge 1 ]; then
    changed=$(git diff --name-only --diff-filter=ACMR "$1"...HEAD)
else
    changed=$(git diff --cached --name-only --diff-filter=ACMR)
fi

[ -z "$changed" ] && exit 0

errors=0
fail() { printf '\n  ✋ %s\n' "$1" >&2; errors=$((errors+1)); }

# ── Rule 1 ────────────────────────────────────────────────────────────────────
# A specification and its implementation may not arrive together. This is the
# exact failure mode: writing a spec and coding it in one breath skips the
# Constitution Check in the plan template and the /speckit-clarify de-risking
# pass, and both exist because this project's defects live in what nobody
# questioned.
specs_touched=$(printf '%s\n' "$changed" | grep -E "$SPEC_FILE" || true)
impl_touched=$(printf '%s\n' "$changed" | grep -E "$IMPLEMENTATION" || true)

if [ -n "$specs_touched" ] && [ -n "$impl_touched" ]; then
    fail "A specification and its implementation are in the same commit.

  Specifications changed:
$(printf '%s\n' "$specs_touched" | sed 's/^/      /')

  Implementation changed:
$(printf '%s\n' "$impl_touched" | sed 's/^/      /' | head -12)

  The flow is: /speckit-specify → /speckit-clarify → /speckit-plan →
  /speckit-tasks → /speckit-implement. The plan is where the Constitution
  Check happens, and clarify is where the questions get asked. Committing
  both at once skips both gates.

  Commit the specification on its own, run the flow, then implement."
fi

# ── Rule 2 ────────────────────────────────────────────────────────────────────
# The chain must not be left half-built: a plan with no tasks is a plan nobody
# can execute, and tasks with no plan are tasks nobody reviewed against the
# constitution.
#
# But `/speckit-plan` legitimately produces plan.md before tasks.md exists, so
# firing on that state would block the flow it is meant to protect — which is
# what it did on its second run. So: a NEW plan may land on its own (you are
# mid-flow), and unrelated work may not land while a plan sits without tasks.
for dir in specs/*/; do
    [ -f "$dir/spec.md" ] || continue
    if [ -f "$dir/plan.md" ] && [ ! -f "$dir/tasks.md" ]; then
        # $dir carries a trailing slash from the glob, so "$dir/plan.md" would be
        # specs/x//plan.md and never match a git path. Strip it.
        plan_path="${dir%/}/plan.md"
        plan_in_commit=$(printf '%s\n' "$changed" | grep -Fx "$plan_path" || true)
        if [ -z "$plan_in_commit" ]; then
            fail "$dir has plan.md but no tasks.md, and this commit is not about that plan.
  Run /speckit-tasks before moving on — a plan nobody turned into tasks is a
  plan that gets implemented from memory."
        fi
    fi
    if [ -f "$dir/tasks.md" ] && [ ! -f "$dir/plan.md" ]; then
        fail "$dir has tasks.md but no plan.md — the Constitution Check never ran."
    fi
done

# ── Rule 3 ────────────────────────────────────────────────────────────────────
# An orphan plan describes a feature nobody specified.
for dir in specs/*/; do
    if [ ! -f "$dir/spec.md" ] && [ -f "$dir/plan.md" ]; then
        fail "$dir has a plan but no spec.md. Run /speckit-specify first."
    fi
done

# ── Rule 4 ────────────────────────────────────────────────────────────────────
# A specification that code cites, or that another specification calls shipped,
# has been through plan and tasks.
#
# The failure this closes (review COD-10, decision P42): **`022` was implemented
# and called «shipped» with no plan.md and no tasks.md.** Rules 1–3 all passed,
# because each of them looks at one commit or at one directory's own files —
# nothing looked at the relationship between «there is code for this» and «this
# went through the gates». So the Constitution Check never ran on it, and two
# other specifications went on to build on top of a claim that was not true:
# `023`'s input line said «after `022` shipped» and its T023 ticked an assertion
# about behaviour that did not exist.
#
# Two signals, both narrow on purpose. A guard that fires on prose gets weakened
# to make a commit pass, and this file's own history says so.
#
#   - **Code cites it.** The repository's own convention — `` `NNN` ``, `NNN FR-`,
#     `NNN T012`, `specs/NNN-` — under `app/`, `recipes/`, `instructions/` or
#     `checklists/`. Rule 8 of AGENTS.md is what makes this decidable.
#   - **Another spec calls it shipped.** Only the literal phrasing that caused the
#     defect: `` `NNN` shipped``, `ships`, `is shipped`, `as shipped`.
#
# Neither is an accusation about a single commit. It is a statement about the
# repository as it stands: if the code knows about a specification, the
# specification has a plan.
# A backtick in a variable, because `\`` inside a double-quoted bash string is
# the start of a command substitution and this script would not parse.
bt='`'

for dir in specs/*/; do
    [ -f "$dir/spec.md" ] || continue
    [ -f "$dir/plan.md" ] && [ -f "$dir/tasks.md" ] && continue

    name=$(basename "${dir%/}")
    num=${name:0:3}

    cited_by_code=$(grep -rlE "$bt$num$bt|(^|[^0-9])$num +(FR-|T[0-9]|US[0-9])|specs/$num-" \
        app recipes instructions checklists 2>/dev/null \
        | grep -v node_modules | grep -v '/out/' | head -5 || true)

    called_shipped=$(grep -rlE "$bt$num$bt[^$bt]{0,20}(shipped|ships)" \
        specs/*/spec.md 2>/dev/null | grep -v "^$dir" | head -5 || true)

    missing=""
    [ -f "$dir/plan.md" ]  || missing="$missing plan.md"
    [ -f "$dir/tasks.md" ] || missing="$missing tasks.md"

    if [ -n "$cited_by_code" ]; then
        fail "$name is cited by code and has no$missing.

  Cited in:
$(printf '%s\n' "$cited_by_code" | sed 's/^/      /')

  This is COD-10 exactly: 022 was implemented and called «shipped» with no plan
  and no tasks, so the Constitution Check never ran on it — and two other
  specifications then built on the claim. Run /speckit-plan and /speckit-tasks;
  or, if the citation is an analogy rather than a dependency, reword it so it
  does not read as one."
    elif [ -n "$called_shipped" ]; then
        fail "$name is called shipped by another specification and has no$missing.

  Claimed in:
$(printf '%s\n' "$called_shipped" | sed 's/^/      /')

  Either it went through the flow, or the sentence is wrong. 023 said «after 022
  shipped» and ticked a task against it; the sentence was the defect."
    fi
done

# ── Visibility ────────────────────────────────────────────────────────────────
# Not an error: several specifications are deliberately unplanned until their
# phase. Printed on every commit so the state is never a surprise.
unplanned=""
for dir in specs/*/; do
    [ -f "$dir/spec.md" ] || continue
    [ -f "$dir/tasks.md" ] && continue
    unplanned="$unplanned $(basename "$dir")"
done

if [ "$errors" -gt 0 ]; then
    cat >&2 <<MSG

  ── Spec Kit gate ────────────────────────────────────────────────────────
  Specifications with no tasks yet (not an error, just the state):
     ${unplanned:- none}

  Override for a genuine exception, and say why in the commit message:
     RAMPA_SKIP_SPECKIT=1 git commit ...

MSG
    exit 1
fi

[ -n "$unplanned" ] && printf '  ℹ Spec Kit: unplanned specs —%s\n' "$unplanned"
exit 0

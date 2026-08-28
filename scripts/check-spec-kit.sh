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
for dir in specs/*/; do
    [ -f "$dir/spec.md" ] || continue
    if [ -f "$dir/plan.md" ] && [ ! -f "$dir/tasks.md" ]; then
        fail "$dir has plan.md but no tasks.md. Run /speckit-tasks."
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

#!/usr/bin/env bash
# Every requirement in a spec is accounted for in its tasks (Spec Kit, the gap).
#
# ── What this exists because of ────────────────────────────────────────────
#
# On 2026-08-30 five requirements were added to `specs/002-compose/spec.md`
# (FR-127…FR-131, from the SDA-IA analysis) **after** its `tasks.md` was written.
# `/speckit-tasks` was never re-run. They sat there for a day, uncited and
# unbuilt, and one of them — FR-126, generated material carrying a material kind —
# was a live defect: a composed sheet reached adaptation with no kind, so no kind
# rule governed it. Which is the exact failure spec 012 exists to prevent.
#
# `check-spec-kit.sh` catches a specification and its implementation arriving in
# one commit. It cannot catch a specification **growing** while its tasks stand
# still, because that is two commits and both look fine.
#
# This is that check. The flow is specify → clarify → plan → tasks → implement,
# and «the spec changed» re-enters it at `tasks`, not at `implement`.
#
# ── The rule ───────────────────────────────────────────────────────────────
#
# Every `**FR-nnn**` defined in `specs/<x>/spec.md` must appear somewhere in
# `specs/<x>/tasks.md`: in a task, or in that file's coverage section saying where
# it is satisfied or why it is not done. Citing it is the archiving — a
# requirement nobody can point at is a requirement nobody is keeping.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail=0
checked=0

for spec in "$ROOT"/specs/*/spec.md; do
  dir=$(dirname "$spec")
  name=$(basename "$dir")
  tasks="$dir/tasks.md"

  # A spec with no tasks yet is `check-spec-kit.sh`'s business, not this one's.
  [ -f "$tasks" ] || continue

  frs=$(grep -o '\*\*FR-[0-9]\{1,\}\*\*' "$spec" 2>/dev/null | tr -d '*' | sort -u || true)
  [ -n "$frs" ] || continue

  missing=""
  for fr in $frs; do
    checked=$((checked + 1))
    if ! grep -q "$fr" "$tasks"; then
      missing="$missing $fr"
    fi
  done

  if [ -n "$missing" ]; then
    echo "  ✗ $name:$(echo "$missing" | tr ' ' '\n' | grep -c . ) requirement(s) in the spec and nowhere in tasks.md"
    echo "     $(echo "$missing" | xargs)"
    fail=1
  else
    echo "  ✓ $name"
  fi
done

if [ "$checked" -eq 0 ]; then
  echo "  ✗ no requirements found to check — this would pass for ever"
  exit 1
fi

if [ "$fail" -ne 0 ]; then
  cat <<'MSG'

  A requirement is in a specification and nowhere in its tasks.

  That is the flow broken at `tasks`, not at `implement`: a spec that grows after
  its tasks were written needs the tasks re-derived, or the requirement recorded
  in the coverage section with where it is satisfied — or why it is not done.

  Either is fine. Silence is not: a requirement nobody can point at is a
  requirement nobody is keeping.
MSG
  exit 1
fi

echo "  $checked requirement(s), all accounted for."

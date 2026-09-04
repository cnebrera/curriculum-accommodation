#!/usr/bin/env bash
# Every requirement in a spec is accounted for in its tasks — and says how.
#
# Deterministic, offline, no model (Principle II). It is two text files and awk.
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
# ── What the review found wrong with the first version (P31, CONS-14) ──────
#
# It asked only whether the number **appeared** in `tasks.md`, and a mention is
# not an account. `011` FR-918/919/920/921 are four MUSTs with no implementation
# and the guard reported «all accounted for», because a paragraph explaining why
# they were not built reads to `grep -q` exactly like a task that built them.
# Two other ways it passed on nothing:
#
#   - **Somebody else's requirement.** `005`'s tasks cite `` `014` FR-516`` — that
#     is *014's* FR-516, and 005 has one of its own with a different meaning.
#     Seven requirements looked archived on a citation of another spec's number.
#     Repository rule 8 (every FR citation carries its spec prefix) is what makes
#     this decidable, so the check now enforces it from the other side.
#   - **A number in prose.** «every column in FR-710 is present» in an
#     independent-test sentence counted as coverage for FR-710.
#
# ── The rule ───────────────────────────────────────────────────────────────
#
# Every requirement a spec **declares** — a bullet beginning `- **FR-nnn**` —
# must be cited in its `tasks.md`, for *this* spec, in one of three shapes, and
# the shape is what says its state:
#
#   1. **In a task** (`- [ ]` / `- [x]`, including its indented continuation
#      lines). The checkbox is the state: unticked is `open`, ticked is `done`.
#   2. **With an explicit marker** — `done:`, `deferred:` or `dropped:` followed
#      by a reason. This outranks a task, so a requirement whose task was
#      overtaken by a decision can say so without the task being rewritten.
#   3. **In a coverage-table row** with something in its cell. The table's own
#      heading decides: a section that says «not done», «deferred», «aplazado»
#      or «needing a person» files its rows as deferred rather than satisfied.
#
# Anything else — the number in a sentence — is not an account, and fails.
#
# And one honesty rule on top: a requirement whose **spec** carries
# `**DEFERRED` or `**DROPPED` may not be reported by its tasks as done or as an
# open task. That is CONS-14 exactly: the spec deferring something while the
# tasks present it as covered is the state that made four MUSTs invisible.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

read -r -d '' CLASSIFY <<'AWK' || true
# Classify one spec's requirements against its tasks.
#   awk -v NUM=<nnn> "$CLASSIFY" spec.md tasks.md
# Prints one line per requirement: <FR> <status> <where>, with `!` prefixed when
# the spec defers it and the tasks say otherwise.

function ours(line, fr,   t) {
  t = line
  # Our own prefixed citations count, so normalise them to the bare form first.
  gsub("`?" NUM "[a-z0-9-]*`?[ \t]+FR-", "FR-", t)
  # Whatever still carries a three-digit prefix belongs to another spec.
  gsub(/`?[0-9][0-9][0-9][a-z0-9-]*`?[ \t]+FR-[0-9]+/, " ", t)
  return t ~ ("(^|[^A-Za-z0-9])" fr "([^0-9]|$)")
}

FNR == NR {
  if (match($0, /^[ \t]*-[ \t]+\*\*FR-[0-9]+\*\*/)) {
    s = substr($0, RSTART, RLENGTH)
    match(s, /FR-[0-9]+/)
    cur = substr(s, RSTART, RLENGTH)
    if (!(cur in own)) { own[cur] = 1; order[++n] = cur }
  } else if ($0 ~ /^#/) {
    cur = ""
  }
  if (cur != "" && $0 ~ /\*\*(DEFERRED|DROPPED)/) declared[cur] = 1
  next
}

{
  if ($0 ~ /^#/) { head = $0; intask = 0 }
  if ($0 ~ /^[ \t]*-[ \t]*\[[xX]\]/)        intask = 2
  else if ($0 ~ /^[ \t]*-[ \t]*\[[ ]\]/)    intask = 1
  else if ($0 !~ /^[ \t]/ && $0 ~ /[^ \t]/) intask = 0
  m++
  line[m] = $0; blk[m] = intask; sect[m] = head
}

END {
  NOTDONE = "[Nn]ot done|[Nn]o hecho|[Dd]eferred|[Aa]plaz|[Pp]endiente|[Dd]ropped|[Rr]etirad|needing a person"

  for (i = 1; i <= n; i++) {
    fr = order[i]
    status = "none"; where = ""; rank = 0
    for (j = 1; j <= m; j++) {
      if (!ours(line[j], fr)) continue

      # An explicit marker outranks everything: a decision taken after the tasks
      # were written must be able to say so without rewriting them.
      if (match(line[j], /(^|[^A-Za-z])(done|deferred|dropped):[ \t]*[^ \t]/)) {
        s = substr(line[j], RSTART, RLENGTH)
        if (s ~ /deferred:/)     status = "deferred"
        else if (s ~ /dropped:/) status = "dropped"
        else                     status = "done"
        where = "marker"; rank = 3
        break
      }
      if (blk[j] > 0 && rank < 2) {
        status = (blk[j] == 2) ? "done" : "open"
        where = "task"; rank = 2
        continue
      }
      if (line[j] ~ /^[ \t]*\|/ && rank < 1) {
        cell = line[j]
        sub(/^[ \t]*\|/, "", cell); sub(/\|[ \t]*$/, "", cell)
        k = split(cell, cells, "|")
        last = cells[k]
        gsub(/^[ \t]+|[ \t]+$/, "", last)
        if (k >= 2 && length(last) >= 3) {
          status = (sect[j] ~ NOTDONE) ? "deferred" : "done"
          where = "coverage"; rank = 1
        }
      }
      # Anything else is the number in a sentence, and a mention is not an
      # account. It does not raise the rank, so it cannot be the answer.
    }
    conflict = (declared[fr] && (status == "done" || status == "open")) ? "!" : ""
    printf "%s%s %s %s\n", conflict, fr, status, where
  }
}
AWK

fail=0
checked=0
total_open=0; total_done=0; total_def=0; total_drop=0
deferred_lines=""

for spec in "$ROOT"/specs/*/spec.md; do
  dir=$(dirname "$spec")
  name=$(basename "$dir")
  num=${name:0:3}
  tasks="$dir/tasks.md"

  # A spec with no tasks yet is `check-spec-kit.sh`'s business, not this one's.
  [ -f "$tasks" ] || continue

  out=$(awk -v NUM="$num" "$CLASSIFY" "$spec" "$tasks")
  [ -n "$out" ] || continue

  n_open=$(printf '%s\n' "$out" | awk '$2=="open"' | wc -l | tr -d ' ')
  n_done=$(printf '%s\n' "$out" | awk '$2=="done"' | wc -l | tr -d ' ')
  n_def=$(printf '%s\n'  "$out" | awk '$2=="deferred"' | wc -l | tr -d ' ')
  n_drop=$(printf '%s\n' "$out" | awk '$2=="dropped"' | wc -l | tr -d ' ')
  unaccounted=$(printf '%s\n' "$out" | awk '$2=="none" { printf "%s ", $1 }')
  conflicts=$(printf '%s\n' "$out" | awk '/^!/ { printf "%s ", substr($1, 2) }')

  checked=$((checked + $(printf '%s\n' "$out" | wc -l | tr -d ' ')))
  total_open=$((total_open + n_open)); total_done=$((total_done + n_done))
  total_def=$((total_def + n_def));    total_drop=$((total_drop + n_drop))

  if [ -n "$unaccounted" ] || [ -n "$conflicts" ]; then
    printf '  ✗ %s\n' "$name"
    [ -n "$unaccounted" ] && printf '     nowhere in tasks.md, or only mentioned in prose: %s\n' "$unaccounted"
    [ -n "$conflicts" ] && printf '     the spec defers these and tasks.md reports them as covered: %s\n' "$conflicts"
    fail=1
  else
    printf '  ✓ %-36s open %-3d done %-3d deferred %-3d dropped %d\n' \
      "$name" "$n_open" "$n_done" "$n_def" "$n_drop"
  fi

  if [ "$n_def" -gt 0 ] || [ "$n_drop" -gt 0 ]; then
    who=$(printf '%s\n' "$out" | awk '$2=="deferred" || $2=="dropped" { printf "%s(%s) ", $1, $2 }')
    deferred_lines="$deferred_lines
     $name: $who"
  fi
done

if [ "$checked" -eq 0 ]; then
  echo "  ✗ no requirements found to check — this would pass for ever"
  exit 1
fi

if [ "$fail" -ne 0 ]; then
  cat <<'MSG'

  A requirement is in a specification and its tasks do not say what became of it.

  That is the flow broken at `tasks`, not at `implement`. Every requirement a
  spec declares must be cited in its own tasks.md, for that spec, as one of:

    - a task            `- [ ] T012 [US1] … (FR-nnn)`   — the checkbox is the state
    - an explicit note  `FR-nnn — deferred: <reason>`   — outranks a task
    - a coverage row    `| FR-nnn | where it is |`      — the heading decides

  A number in a sentence is not an account, and `` `014` FR-516`` in 005's tasks
  is *014's* requirement, not 005's (repository rule 8).

  And if the spec marks a requirement `**DEFERRED` or `**DROPPED`, its tasks must
  say the same. A spec that defers something while its tasks report it as covered
  is how four MUSTs in `011` were invisible for a week.

MSG
  exit 1
fi

printf '  %d requirement(s): %d open · %d done · %d deferred · %d dropped.\n' \
  "$checked" "$total_open" "$total_done" "$total_def" "$total_drop"

# Printed on every run, not only on failure. «All accounted for» used to be the
# last thing this said, and it reads as «all built» — which was untrue by four.
if [ -n "$deferred_lines" ]; then
  printf '  ℹ Deferred or dropped, on purpose and with a reason:%s\n' "$deferred_lines"
fi

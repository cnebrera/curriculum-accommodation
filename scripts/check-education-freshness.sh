#!/usr/bin/env bash
# Every education file was re-read within STALE_AFTER_DAYS (011 T022, FR-908).
#
# `last_checked` is the day somebody read the education authority's pages — not the
# day the file was edited. A file nobody has re-read in over a year is a file making
# claims about a school system that may have moved, and the person who finds out is a
# teacher whose learner's course is not on the list.
#
# **Fails the build.** Unlike the interface, which marks a stale file and keeps using
# it — hiding the only education system leaves her unable to record a course at all,
# and a slightly out-of-date list is far better than none. Here, where the audience is
# a contributor rather than a teacher, the honest response is to stop.
#
# Same shape as `check-catalogue-freshness.sh`, deliberately: two corpora, one habit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/instructions/education"
# 400 rather than 365: a file checked at the start of one school year should not turn
# red in the middle of the next one for being six weeks over. Matches
# STALE_AFTER_DAYS in packages/core/src/education/lookup.ts.
LIMIT=400

today=$(date -u +%s)
fail=0
found=0

for f in "$DIR"/*.md; do
  [ -e "$f" ] || continue
  base=$(basename "$f")
  [ "$base" = "README.md" ] && continue
  found=$((found + 1))

  checked=$(sed -n 's/^last_checked:[[:space:]]*"\{0,1\}\([0-9-]\{10\}\)"\{0,1\}.*/\1/p' "$f" | head -1)

  if [ -z "$checked" ]; then
    echo "  ✗ $base has no last_checked"
    fail=1
    continue
  fi

  # BSD date on macOS, GNU date on Linux. Both, because both are developer machines.
  if date -j -f "%Y-%m-%d" "$checked" +%s >/dev/null 2>&1; then
    then_s=$(date -j -f "%Y-%m-%d" "$checked" +%s)
  else
    then_s=$(date -u -d "$checked" +%s)
  fi

  days=$(( (today - then_s) / 86400 ))
  if [ "$days" -gt "$LIMIT" ]; then
    echo "  ✗ $base was last checked $days days ago ($checked), limit is $LIMIT"
    fail=1
  else
    echo "  ✓ $base checked $days days ago"
  fi
done

# A check that found nothing to check passes for ever. The same trap the ingest
# fixture harness and the boundary test both guard against.
if [ "$found" -eq 0 ]; then
  echo "  ✗ no education files found in $DIR — this check would pass for ever"
  exit 1
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "  An education file makes claims about a school system nobody has re-read."
  echo "  Read the education authority's pages, correct what moved, and set"
  echo "  last_checked to today. instructions/education/README.md says how."
  exit 1
fi

echo "  $found education file(s), all within $LIMIT days."

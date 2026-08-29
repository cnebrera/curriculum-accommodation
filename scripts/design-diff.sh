#!/usr/bin/env bash
# Drift between the design project and the shipped stylesheets (010 T032, R5).
#
# R5 decided that the design project stays the source of truth for the previews
# and that `tokens.css` and `components.css` are lifted *verbatim* into
# `app/ui/src/styles/`. "Verbatim" is a claim, and a claim with no check on it
# drifts — a value tuned in the preview and never carried across, or the reverse,
# and the previews stop being a preview of anything.
#
# This makes it one command instead of a judgement.
#
#   scripts/design-diff.sh                     # uses $RAMPA_DESIGN_DIR
#   scripts/design-diff.sh path/to/design/dir
#
# Deliberately NOT in CI: the design project is not checked into this
# repository, so a CI job could only ever skip or lie. It is a contributor
# command, which is exactly what R5 says the previews are for.
set -uo pipefail

SHIPPED="$(cd "$(dirname "$0")/.." && pwd)/app/ui/src/styles"
DESIGN="${1:-${RAMPA_DESIGN_DIR:-}}"

if [ -z "$DESIGN" ]; then
  cat >&2 <<'MSG'
No design directory given.

  scripts/design-diff.sh path/to/design/styles

or set it once:

  export RAMPA_DESIGN_DIR=path/to/design/styles

It should be the directory holding the design project's tokens.css and
components.css — the ones the preview pages load.
MSG
  exit 2
fi

if [ ! -d "$DESIGN" ]; then
  echo "Not a directory: $DESIGN" >&2
  exit 2
fi

status=0
for f in tokens.css components.css; do
  if [ ! -f "$DESIGN/$f" ]; then
    echo "── $f: not in the design directory ────────────────────────────────"
    echo "   Expected $DESIGN/$f"
    status=1
    continue
  fi
  if diff -q "$DESIGN/$f" "$SHIPPED/$f" >/dev/null 2>&1; then
    echo "── $f: identical ──────────────────────────────────────────────────"
  else
    echo "── $f: DRIFTED ───────────────────────────────────────────────────"
    echo "   < design    > shipped"
    diff "$DESIGN/$f" "$SHIPPED/$f" | sed 's/^/   /'
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  cat <<'MSG'

One of them has moved. Decide which is right and copy it over — but if the
shipped one is right, the design project needs the same change, or the next
person to review a component reviews the wrong colours.

Whichever way it goes, `cd app && npm test` afterwards: the contrast suite reads
the shipped tokens.css, so a value changed here is a value it re-checks.
MSG
fi
exit "$status"

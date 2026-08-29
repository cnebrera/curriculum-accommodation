#!/usr/bin/env bash
# Catalogue entries whose facts are going stale (009 T039, research R3).
#
# The application stops offering a service when `last_checked` passes 365 days,
# and shows a "comprobado hace N meses" marker from 181. This fails the build at
# **300**, deliberately earlier than both: a contributor should fix it before any
# teacher sees a marker, and long before a service silently disappears from her
# connection screen.
#
# What "fix it" means is not editing the date. It means opening the provider's
# own pages and re-reading the free tier, the cost, where it is processed and
# what the terms say about training — then setting the date to the day you did
# that. The date is a claim about work performed, and this check only measures
# how long ago the claim was made.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/instructions/providers"
WARN_DAYS=${RAMPA_CATALOGUE_WARN_DAYS:-300}

if [ ! -d "$DIR" ]; then
  echo "No catalogue at $DIR" >&2
  exit 1
fi

# GNU date and BSD date disagree on everything; python is present on every
# runner this project uses and on every contributor's machine.
exec python3 - "$DIR" "$WARN_DAYS" <<'PY'
import datetime, pathlib, re, sys

directory, warn_days = pathlib.Path(sys.argv[1]), int(sys.argv[2])
today = datetime.date.today()
problems, checked = [], 0

for path in sorted(directory.glob('*.md')):
    if path.name == 'README.md':
        continue
    text = path.read_text(encoding='utf8')
    match = re.search(r'^last_checked:\s*"?(\d{4}-\d{2}-\d{2})"?\s*$', text, re.M)
    if not match:
        # A missing date is worse than an old one: the parser skips the entry
        # entirely, so the service silently vanishes with no marker anywhere.
        problems.append(f'  {path.name}: no last_checked at all — the app will not offer it')
        continue
    checked += 1
    age = (today - datetime.date.fromisoformat(match.group(1))).days
    if age > 365:
        problems.append(f'  {path.name}: {age} days old — the app has ALREADY stopped offering it')
    elif age > warn_days:
        problems.append(f'  {path.name}: {age} days old — past {warn_days}, fix before a teacher sees the marker')

if checked == 0:
    print('No catalogue entries found. That is a broken check, not a clean run.', file=sys.stderr)
    sys.exit(1)

if problems:
    print(f'\nCatalogue facts need re-checking ({checked} entries read):\n', file=sys.stderr)
    print('\n'.join(problems), file=sys.stderr)
    print("""
Re-read the provider's own pages — free tier, cost, where it is processed, what
the terms say about training — and then set last_checked to the day you did it.
Editing the date without re-reading turns a dated claim into an undated one.

The contract is in specs/009-connect-wizard/contracts/provider-catalogue.md.
""", file=sys.stderr)
    sys.exit(1)

print(f'Catalogue fresh: {checked} entries, none older than {warn_days} days.')
PY

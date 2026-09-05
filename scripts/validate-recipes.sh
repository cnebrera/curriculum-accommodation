#!/usr/bin/env bash
# Validate recipe structure. Deterministic, offline, no model — Principle II.
# Checks form, never pedagogy: it cannot tell you a recipe is wrong, only that
# it is malformed or refers to something that does not exist.
set -uo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

errors=0
ids=""

mapfile -t files < <(find recipes -name '*.md' ! -name 'README.md' | sort)

fail() { echo "  ✗ $1: $2"; errors=$((errors+1)); }

# Pass 1 — collect ids so `conflicts` can be checked against them.
for f in "${files[@]}"; do
    id=$(awk 'NR==1&&/^---$/{f=1;next} f&&/^---$/{exit} f' "$f" | sed -n 's/^id:[[:space:]]*//p')
    [ -n "$id" ] && ids="$ids $id"
done

# Pass 2 — validate.
for f in "${files[@]}"; do
    head -1 "$f" | grep -q '^---$' || { fail "$f" "no YAML front matter"; continue; }
    fm=$(awk 'NR==1&&/^---$/{f=1;next} f&&/^---$/{exit} f' "$f")

    for key in id version axes scope evidence; do
        printf '%s\n' "$fm" | grep -q "^$key:" || fail "$f" "missing '$key'"
    done

    printf '%s\n' "$fm" | grep -qE '^version:[[:space:]]*[0-9]+$' \
        || fail "$f" "version must be an integer"

    # axes: [] is valid (a recipe that always applies); otherwise CODE>=N.
    axes=$(printf '%s\n' "$fm" | sed -n 's/^axes:[[:space:]]*\[\(.*\)\]$/\1/p')
    if [ -n "$axes" ]; then
        for a in $(printf '%s' "$axes" | tr -d ' ' | tr ',' ' '); do
            printf '%s' "$a" | grep -qE '^[A-Z]+(-[A-Z])?(>=|<=|=)[0-3]$' \
                || fail "$f" "bad axis condition '$a'"
        done
    fi

    # marks: [vehicular>=1] — a profile fact that is not one of the ten axes (`033`).
    #
    # Optional, and validated the same way the axes are: an unreadable condition is a
    # recipe that is silently never selected, which is the defect this whole file exists
    # to catch early. The known marks are listed here **and** in `recipes/index.ts`; the
    # two are checked against each other by `mark-selection.test.ts`.
    marks=$(printf '%s\n' "$fm" | sed -n 's/^marks:[[:space:]]*\[\(.*\)\]$/\1/p')
    if [ -n "$marks" ]; then
        for m in $(printf '%s' "$marks" | tr -d ' ' | tr ',' ' '); do
            printf '%s' "$m" | grep -qE '^(vehicular)(>=|<=|=)[0-3]$' \
                || fail "$f" "bad mark condition '$m'"
        done
    fi

    conflicts=$(printf '%s\n' "$fm" | sed -n 's/^conflicts:[[:space:]]*\[\(.*\)\]$/\1/p')
    for c in $(printf '%s' "$conflicts" | tr -d ' ' | tr ',' ' '); do
        [ -z "$c" ] && continue
        printf '%s' "$ids" | tr ' ' '\n' | grep -qx "$c" \
            || fail "$f" "conflicts with unknown recipe '$c'"
    done

    # «Anti-patrones» as well as «Anti-patterns» (`033` T005, decision P28).
    #
    # The corpus is Spanish-source from now on, and a validator that only reads English
    # headings would reject every new recipe — which is the shape of check that gets
    # switched off rather than obeyed.
    grep -qiE '^#+[[:space:]]*Anti-?(patterns|patrones)' "$f" \
        || fail "$f" "no anti-patterns section — see recipes/README.md"

    # An empty anti-patterns heading is the same as none.
    awk 'tolower($0) ~ /^#+[[:space:]]*anti-?(patterns|patrones)/{f=1;next} f&&/^#/{exit} f&&NF{n++} END{exit !(n>0)}' "$f" \
        || fail "$f" "anti-patterns section is empty"
done

echo
if [ "$errors" -eq 0 ]; then
    echo "✓ ${#files[@]} recipes, no structural problems."
else
    echo "✗ $errors problem(s) across ${#files[@]} recipes."
fi
echo "  Structure only. Whether a recipe is pedagogically right is a human review."
exit $((errors > 0))

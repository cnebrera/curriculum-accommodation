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

# ── Pass 3 ────────────────────────────────────────────────────────────────────
# Every recipe cited anywhere in the corpus or in the IR contract exists, with the
# version cited.
#
# The defect this closes (`039` FR-3710): `docs/ir.md` teaches the model the IR format,
# and its worked example for `4a`/`4b` cited **`one-task-per-item@1`**, which has never
# existed. So the contract taught the model to cite a recipe that leads nowhere — and a
# citation that leads nowhere teaches the teacher that the report is decoration.
#
# Why this and not «check the report at runtime»: a broken citation is a property of the
# corpus, and the corpus is written by people. Catching it here costs nothing and catches
# it the day it is written, not the day a teacher reads a report.
#
# Only backticked `id@version` counts. Prose naming a recipe without a version is a
# reference and not a citation, and a guard that fires on prose gets weakened to make a
# commit pass — this file's own history says so.
cited_in=(docs/ir.md)
while IFS= read -r f; do cited_in+=("$f"); done < <(find instructions recipes -name '*.md')

for f in "${cited_in[@]}"; do
    [ -f "$f" ] || continue
    while IFS= read -r ref; do
        cid="${ref%@*}"
        cver="${ref#*@}"
        if ! printf '%s' "$ids" | tr ' ' '\n' | grep -qx "$cid"; then
            fail "$f" "cites recipe '$cid' (as $ref) and no recipe declares that id"
            continue
        fi
        have=$(grep -rl "^id:[[:space:]]*$cid\$" recipes --include='*.md' | head -1)
        real=$(awk 'NR==1&&/^---$/{f=1;next} f&&/^---$/{exit} f' "$have" \
            | sed -n 's/^version:[[:space:]]*//p' | tr -d ' ')
        [ "$real" = "$cver" ] \
            || fail "$f" "cites $ref but '$cid' is version $real"
    done < <({
        # Backticked prose: `one-task-per-page@1`.
        grep -oE '`[a-z0-9]+(-[a-z0-9]+)*@[0-9]+`' "$f" 2>/dev/null | tr -d '`'
        # And the attribute itself, which is where the defect actually was: the worked
        # example in `docs/ir.md` carries `data-recipe="one-task-per-item@1"` inside a
        # fenced block, so no backticks surround it. A list is allowed there, so split
        # on commas (backlog G70).
        grep -oE 'data-recipe="[^"]*"' "$f" 2>/dev/null \
            | sed 's/data-recipe="//; s/"$//' | tr ',' '\n' | tr -d ' '
    } | grep -E '^[a-z0-9]+(-[a-z0-9]+)*@[0-9]+$' | sort -u)
done

echo
if [ "$errors" -eq 0 ]; then
    echo "✓ ${#files[@]} recipes, no structural problems."
else
    echo "✗ $errors problem(s) across ${#files[@]} recipes."
fi
echo "  Structure only. Whether a recipe is pedagogically right is a human review."
exit $((errors > 0))

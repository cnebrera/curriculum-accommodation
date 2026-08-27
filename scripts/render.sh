#!/usr/bin/env bash
# Render adapted IR to HTML. Deterministic: no model, no network, no API key.
#
#   scripts/render.sh material/<job>/adapted.md output/<job>/sheet.html
set -euo pipefail

src="${1:?usage: render.sh <adapted.md> <out.html>}"
out="${2:?usage: render.sh <adapted.md> <out.html>}"
root="$(cd "$(dirname "$0")/.." && pwd)"

command -v pandoc >/dev/null 2>&1 || {
    echo "pandoc not found. Run scripts/doctor.sh." >&2; exit 1; }

mkdir -p "$(dirname "$out")"

pandoc "$src" \
    --from markdown+fenced_divs+bracketed_spans+tex_math_dollars+yaml_metadata_block \
    --to html5 \
    --template "$root/templates/base.html" \
    --standalone \
    --mathml \
    --output "$out"

echo "✓ $out"

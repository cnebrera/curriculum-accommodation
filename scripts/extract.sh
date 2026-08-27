#!/usr/bin/env bash
# First-pass extraction for digital sources only (PDF with a text layer, DOCX,
# ODT, HTML). Output is a STARTING POINT for /rampa-ingest, never the IR itself:
# block classification and figure roles are judgement, and belong to the agent.
#
# Scanned PDFs and photos are not handled here on purpose — see
# harness/commands/ingest.md.
set -euo pipefail

src="${1:?usage: extract.sh <source-file> [out.md]}"
out="${2:-${src%.*}.raw.md}"

case "${src##*.}" in
    pdf)
        if pdffonts "$src" 2>/dev/null | tail -n +3 | grep -q .; then
            pdftotext -layout "$src" - | sed 's/\f/\n\n---\n\n/g' > "$out"
        else
            echo "No text layer: '$src' looks scanned." >&2
            echo "Read the pages with vision instead — see harness/commands/ingest.md." >&2
            exit 2
        fi
        ;;
    docx|odt|html|htm|rtf|epub)
        pandoc "$src" --to markdown+fenced_divs --wrap=none --output "$out"
        ;;
    md|txt)
        cp "$src" "$out"
        ;;
    *)
        echo "Unsupported: .${src##*.}" >&2; exit 1
        ;;
esac

echo "✓ $out"
echo "  Raw text only. Classify blocks and assign figure roles in /rampa-ingest."

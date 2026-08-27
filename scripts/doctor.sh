#!/usr/bin/env bash
# Report which optional tools are present. Everything degrades gracefully:
# a missing tool removes one output modality, never the whole pipeline.
set -uo pipefail

ok=0; missing=0
check() {
    local cmd="$1" what="$2"
    if command -v "$cmd" >/dev/null 2>&1; then
        printf '  ✓ %-12s %s\n' "$cmd" "$what"; ok=$((ok+1))
    else
        printf '  ✗ %-12s %s — MISSING\n' "$cmd" "$what"; missing=$((missing+1))
    fi
}

echo
echo "Rampa — environment check"
echo
echo "Core:"
check pandoc      "HTML, ODT, plain text rendering"
echo
echo "Optional (each missing tool disables one output):"
check chromium    "HTML → PDF (or use: chromium-browser, google-chrome)"
check weasyprint  "HTML → PDF, alternative to chromium"
check pdftotext   "text extraction from digital PDFs (poppler-utils)"
check piper       "offline text-to-speech for audio output"
check ffmpeg      "audio post-processing"
echo
echo "Git protection:"
if [ "$(git config core.hooksPath 2>/dev/null)" = ".githooks" ]; then
    echo "  ✓ pre-commit hook active — profiles/, material/ and output/ are blocked"
else
    echo "  ✗ pre-commit hook NOT active — run scripts/setup-hooks.sh"
    missing=$((missing+1))
fi
echo "Corpus:"
if bash "$(dirname "$0")/validate-recipes.sh" >/dev/null 2>&1; then
    echo "  ✓ recipes pass structural validation"
else
    echo "  ✗ recipes have structural problems — run scripts/validate-recipes.sh"
    missing=$((missing+1))
fi
echo
echo "$ok present, $missing missing."
[ "$missing" -gt 0 ] && echo "Nothing here is fatal. See README.md for what each one enables."
echo
exit 0

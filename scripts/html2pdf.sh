#!/usr/bin/env bash
# HTML → PDF using whichever headless browser is available.
set -euo pipefail

src="${1:?usage: html2pdf.sh <in.html> <out.pdf>}"
out="${2:?usage: html2pdf.sh <in.html> <out.pdf>}"
mkdir -p "$(dirname "$out")"

for browser in chromium chromium-browser google-chrome; do
    if command -v "$browser" >/dev/null 2>&1; then
        "$browser" --headless --disable-gpu --no-sandbox \
            --print-to-pdf="$out" --no-pdf-header-footer "file://$(realpath "$src")"
        echo "✓ $out (via $browser)"; exit 0
    fi
done

if command -v weasyprint >/dev/null 2>&1; then
    weasyprint "$src" "$out"; echo "✓ $out (via weasyprint)"; exit 0
fi

echo "No headless browser or weasyprint found. Run scripts/doctor.sh." >&2
exit 1

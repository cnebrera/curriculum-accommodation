#!/usr/bin/env bash
# Point git at the repository's hooks. Run once after cloning.
set -euo pipefail
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
echo "✓ Hooks enabled. Commits touching profiles/, material/ or output/ are now blocked."

#!/usr/bin/env bash
# Full build: fetch upstream -> patch glue -> compile puzzles to WASM -> assemble docs/.
#
# Requirements: git, node, cmake, perl, and the Emscripten SDK (emcc on PATH).
#   macOS:  brew install emscripten cmake
#   other:  https://emscripten.org/docs/getting_started/downloads.html
set -euo pipefail

cd "$(dirname "$0")/.."
UPSTREAM_URL="https://git.tartarus.org/simon/puzzles.git"
UPSTREAM_REV="616da16f25da428ccda805536209095bd062676e"   # pinned for reproducibility

command -v emcc >/dev/null || { echo "emcc not found - install the Emscripten SDK" >&2; exit 1; }
command -v cmake >/dev/null || { echo "cmake not found" >&2; exit 1; }

if [ ! -d .upstream/.git ]; then
  git init -q .upstream
  git -C .upstream remote add origin "$UPSTREAM_URL"
fi
if ! git -C .upstream cat-file -e "$UPSTREAM_REV^{commit}" 2>/dev/null; then
  git -C .upstream fetch --depth 1 origin "$UPSTREAM_REV"
fi
git -C .upstream checkout -q -f "$UPSTREAM_REV"

node scripts/patch-glue.mjs

mkdir -p .build
(
  cd .build
  # Modern Emscripten refuses very old browser targets, so pin sane minimums.
  emcmake cmake ../.upstream -DCMAKE_BUILD_TYPE=Release \
    -DMIN_FIREFOX_VERSION=90 -DMIN_CHROME_VERSION=90 >/dev/null
  emmake make -j"$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)" 2>&1 | grep -E "error|Error" || true
)

node scripts/build-site.mjs
echo "Done. Run 'npm run serve' and open http://localhost:8080"

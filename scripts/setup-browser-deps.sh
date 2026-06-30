#!/usr/bin/env bash
# Rootless install of the system libraries + fonts that headless Chromium needs.
#
# Use this ONLY when you can't run the standard, recommended command:
#
#     sudo npx playwright install-deps chromium
#
# On machines without sudo, this script downloads the required .deb packages and
# extracts them into <project>/.runtime (no root needed), then writes
# .runtime/env.sh which exports LD_LIBRARY_PATH + FONTCONFIG_FILE. Source that
# file before running the benchmark:
#
#     bash scripts/setup-browser-deps.sh
#     source .runtime/env.sh
#     npm run bench -- --dry-run
#
# Requires apt-get + dpkg-deb to be present (Debian/Ubuntu), which they are even
# without root privileges.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RT="$ROOT/.runtime"
DEBS="$RT/debs"
LIBROOT="$RT/libroot"
mkdir -p "$DEBS" "$LIBROOT" "$RT/cache"

# t64 names cover Ubuntu 24.04+; plain names cover older releases. Misses are ok.
PKGS=(
  libnss3 libnspr4 libasound2t64 libasound2 libatk1.0-0t64 libatk1.0-0
  libatk-bridge2.0-0t64 libatk-bridge2.0-0 libatspi2.0-0t64 libatspi2.0-0
  libgbm1 libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3
  libxrandr2 libxau6 libxdmcp6 libxrender1 libxi6 libxtst6 libdbus-1-3
  libexpat1 libdrm2 libwayland-server0 libxkbcommon0 libpango-1.0-0 libcairo2
  libcups2t64 libcups2 libfontconfig1 libfreetype6 libpng16-16t64 libpng16-16
  libbrotli1 libbz2-1.0 fonts-dejavu-core fonts-liberation2
)

echo "▶ Downloading packages into $DEBS ..."
( cd "$DEBS"
  for p in "${PKGS[@]}"; do
    apt-get download "$p" >/dev/null 2>&1 && echo "  ok   $p" || echo "  miss $p"
  done )

echo "▶ Extracting into $LIBROOT ..."
for d in "$DEBS"/*.deb; do dpkg-deb -x "$d" "$LIBROOT"; done

LIBDIR="$LIBROOT/usr/lib/x86_64-linux-gnu"
FONTSDIR="$LIBROOT/usr/share/fonts"

cat > "$RT/fonts.conf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>$FONTSDIR</dir>
  <cachedir>$RT/cache</cachedir>
  <match target="pattern"><test name="family"><string>Helvetica</string></test><edit name="family" mode="assign" binding="same"><string>DejaVu Sans</string></edit></match>
  <match target="pattern"><test name="family"><string>Arial</string></test><edit name="family" mode="assign" binding="same"><string>DejaVu Sans</string></edit></match>
</fontconfig>
EOF

cat > "$RT/env.sh" <<EOF
# Source this before running the benchmark on a sudo-less host.
export LD_LIBRARY_PATH="$LIBDIR:\${LD_LIBRARY_PATH:-}"
export FONTCONFIG_FILE="$RT/fonts.conf"
EOF

echo "✓ Done. Now run:  source .runtime/env.sh  &&  npm run bench"

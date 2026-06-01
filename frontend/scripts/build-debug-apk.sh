#!/usr/bin/env bash
# Build a debug APK for sideloading on your phone.
# Usage: ./scripts/build-debug-apk.sh [YOUR_PC_LAN_IP]
# Example: ./scripts/build-debug-apk.sh 192.168.1.42

set -euo pipefail
cd "$(dirname "$0")/.."

IP="${1:-}"
if [[ -z "$IP" ]]; then
  if command -v ipconfig >/dev/null 2>&1; then
    IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
  fi
  if [[ -z "$IP" ]]; then
    echo "Usage: $0 <your-computer-wifi-ip>"
    echo "Example: $0 192.168.1.42"
    exit 1
  fi
  echo "Using detected IP: $IP"
fi

API_URL="http://${IP}:8000/api"
echo "VITE_API_URL=$API_URL" > .env.production
echo "→ Wrote .env.production"

npm run build
npx cap sync android

if [[ ! -d android ]]; then
  echo "Adding Android platform..."
  npx cap add android
  npx cap sync android
fi

cd android
./gradlew assembleDebug

APK="app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "✓ Debug APK ready:"
echo "  $(pwd)/$APK"
echo ""
echo "Backend (same Wi‑Fi as phone):"
echo "  cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000"

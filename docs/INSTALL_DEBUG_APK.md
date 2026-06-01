# Install debug APK on your phone (Option B)

Documentation index: [README.md](README.md)

Use this to test **Spendly** on your personal Android phone without the Play Store.

---

## Before you build

### 1. Find your computer’s Wi‑Fi IP

**Mac:** System Settings → Network → Wi‑Fi → Details, or run:

```bash
ipconfig getifaddr en0
```

Example: `192.168.1.42`

### 2. Start the backend (phone must reach it)

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

In `backend/.env` (dev), allow the app origin:

```env
CORS_ORIGINS=http://localhost:5173,capacitor://localhost,https://localhost,http://192.168.1.42:5173
```

Replace `192.168.1.42` with your IP. Phone and PC must be on the **same Wi‑Fi**.

### 3. Set API URL and build

```bash
cd frontend

# Replace with YOUR computer IP
echo "VITE_API_URL=http://192.168.1.42:8000/api" > .env.production

npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

**APK location:**

```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Install on the phone

1. Copy `app-debug.apk` to the phone (USB, Google Drive, WhatsApp, AirDrop to Android, etc.).
2. Open the file on the phone → **Install**.
3. If blocked: **Settings → Security** (or Apps) → allow install from that source (“Unknown apps”).
4. Open **Expense Tracker** / Spendly → register or sign in.

---

## Rebuild after code changes

Whenever you change the app or API URL:

```bash
cd frontend
# update .env.production if IP changed
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```

Install the new APK over the old one (same debug signature).

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| **Cannot reach the server** in app (but `/health` works in Chrome) | **Mixed content:** app used `https://localhost` + `http://API`. Fix: `capacitor.config.json` → `"androidScheme": "http"`, rebuild APK. Also restart backend after updating `CORS_ORIGINS` in `.env`. |
| **Cannot reach the server** on phone | 1) Backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000` 2) Phone browser: open `http://YOUR_IP:8000/health` 3) Reinstall latest `app-debug.apk` |
| Login / network error | Wrong `VITE_API_URL` — rebuild: `./scripts/build-debug-apk.sh YOUR_IP` |
| Can’t reach server | Same Wi‑Fi; Mac firewall allows port **8000**; IP may have changed (`ipconfig getifaddr en0`) |
| CORS error | `backend/.env`: `CORS_ORIGINS=...,capacitor://localhost,https://localhost` then restart backend |
| App opens but blank | Run `npm run build` then `npx cap sync` again |

---

## One-command script (optional)

From `frontend/`:

```bash
./scripts/build-debug-apk.sh 192.168.1.42
```

Uses your IP in `.env.production`, builds, and prints the APK path.

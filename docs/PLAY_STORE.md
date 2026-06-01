# Play Store Publication Guide

This app is a **React + Capacitor** Android wrapper around a **FastAPI** backend. Follow these steps to publish on Google Play.

## Checklist before submission

### App (done in codebase)
- Mobile-first UI with safe-area support
- Privacy Policy screen (Settings + login)
- Account deletion (Settings → Delete Account)
- Export/import backup
- Offline network banner
- Capacitor Android shell configured
- Secure token storage on native (Capacitor Preferences)

### You must complete
- Deploy backend to HTTPS (Railway, Fly.io, Render, VPS + nginx)
- Set production env vars (see `backend/.env.example`)
- Set `VITE_API_URL=https://your-api.com/api` in `frontend/.env.production`
- Generate PNG launcher icons
- Build signed AAB in Android Studio
- Play Console: Data Safety form, screenshots, feature graphic

---

## 1. Deploy the backend

```bash
ENV=production
DATABASE_URL=postgresql://...
SECRET_KEY=<openssl rand -hex 32>
CORS_ORIGINS=https://your-domain.com,capacitor://localhost
ENABLE_DOCS=false
AUTO_CREATE_TABLES=false

alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Use PostgreSQL in production. Terminate TLS at your reverse proxy.

---

## 2. Build the Android app

```bash
cd frontend
echo "VITE_API_URL=https://api.yourdomain.com/api" > .env.production

npm install
npm run build
npx cap add android   # first time only
npx cap sync
npm run cap:android   # opens Android Studio
```

In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**

---

## 3. Play Console

1. Developer account ($25 one-time)
2. Store listing + privacy policy URL
3. Data safety: collects username, financial data; deletion available in-app
4. Upload AAB to Internal testing first
5. Promote to Production

---

## 4. Store assets

| Asset | Size |
|-------|------|
| App icon | 512×512 PNG |
| Feature graphic | 1024×500 PNG |
| Screenshots | 2+ phone screenshots |

---

## 5. Version updates

Bump `versionCode` in `android/app/build.gradle`, rebuild AAB, upload to Play Console.

# Offline mode & sync

Spendly is **online-first** with an **offline cache** and **mutation queue** on the client.

---

## Components

| File | Role |
|------|------|
| `localDb.ts` | IndexedDB: cache keys + FIFO queue |
| `offlineSync.ts` | `fetchWithCache`, `syncPendingMutations`, `cacheFromServer` |
| `hooks.ts` | React Query wrappers (`networkMode: offlineFirst`) |
| `SyncProvider.tsx` | Sync on reconnect; banner event |
| `OfflineBanner.tsx` | UI for offline / pending count |

---

## IndexedDB

**Database:** `spendly_offline` (v1)

**Cache keys:**

- `transactions`
- `categories`
- `autoPays`
- `budgetConfig`
- `budgetSummary`

**Queue items:** `ADD_TRANSACTION`, `DELETE_TRANSACTION`, `UPDATE_TRANSACTION`, `ADD_CATEGORY`, `DELETE_CATEGORY`, `UPDATE_BUDGET`, `ADD_AUTO_PAY`, `DELETE_AUTO_PAY`

Offline-created IDs: `offline-{uuid}` (reconciled after sync).

---

## Read path

1. `fetchWithCache(apiFn, getLocal, setLocal)`
2. If offline → return cache or `OfflineNoCacheError`
3. If online → fetch API, update cache, return data
4. On network error while online → fallback to cache if present

---

## Write path

1. `mutateWithOffline(onlineFn, offlineFn)`
2. If offline (or online fails and still offline) → run offline handler, patch cache, enqueue
3. If online succeeds → invalidate and `cacheFromServer()`

---

## Sync

On app load (authenticated) and when browser goes online:

1. If queue non-empty → `syncPendingMutations()` (FIFO)
2. Else → `cacheFromServer()` (parallel GETs)
3. `hydrateQueryCache()` → React Query reads from IndexedDB

Failed queue items stay for retry.

---

## Logout

`localDb.clearAll()` + `queryClient.clear()` on logout / 401 — prevents leaking data to the next user on a shared device.

---

## Limitations

| Topic | Behavior |
|-------|----------|
| First visit offline | No cache → error screen |
| Login / register | Requires network |
| Dashboard after offline edit | Optimistic `safe_to_spend` may differ until sync (no full amortization client-side) |
| Import / export | Online only |
| Auto-pay billing | Server-only; offline-created rules bill after sync |

---

## Android notes

- Use `androidScheme: http` in `capacitor.config.json` when API is `http://LAN_IP` (avoids mixed-content block).
- See [INSTALL_DEBUG_APK.md](INSTALL_DEBUG_APK.md).

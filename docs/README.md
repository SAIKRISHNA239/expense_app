# Spendly documentation

Documentation for the **Spendly** expense tracker (`expense_app` repository).

---

## Start here

| If you want to… | Read |
|-----------------|------|
| Run the app locally | [DEVELOPMENT.md](DEVELOPMENT.md) |
| Understand features & screens | [FEATURES.md](FEATURES.md) |
| See how frontend + backend fit together | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Call or extend the API | [API.md](API.md) |
| Work with the database | [DATABASE.md](DATABASE.md) |
| Understand offline mode | [OFFLINE.md](OFFLINE.md) |
| Install on your Android phone | [INSTALL_DEBUG_APK.md](INSTALL_DEBUG_APK.md) |
| Publish to Google Play | [PLAY_STORE.md](PLAY_STORE.md) |

---

## App summary

**Spendly** helps you track daily spending and answers one question: *How much can I safely spend right now?*

- **Log** — quick expense/income entry with categories and optional spread over months.
- **Overview** — safe-to-spend amount, month spend, category bars, weekly chart, upcoming auto-pays.
- **History** — full ledger with search and edit.
- **Settings** — budget variables, categories, auto-pay rules, JSON backup, delete account.

Data is stored per user on the server. The mobile app uses the same API with offline cache and a sync queue.

---

## Version & branding

| Item | Value |
|------|--------|
| Product name (UI) | Spendly |
| Capacitor app name | Expense Tracker |
| Package ID | `com.expensetracker.app` |
| API version | 1.0.0 |

---

## Related files

- Root overview: [../README.md](../README.md)
- Backend env template: [../backend/.env.example](../backend/.env.example)
- Frontend env template: [../frontend/.env.example](../frontend/.env.example)

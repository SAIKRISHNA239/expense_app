# Features & user guide

This document describes what Spendly does from a **user** and **product** perspective.

---

## Tabs

### Log

- Enter amount with on-screen **numpad** (Indian-style grouping).
- Pick a **category** (emoji chips); toggle **income** separately.
- Optional **spread** over 2–120 months (amortization).
- Shows last few entries; swipe-friendly delete on recent items.
- Requires at least one expense category (seeded on register).

### Overview (Dashboard)

- **Safe to spend** — main number with status (healthy / tight / over).
- **Spent this month**, income, rollover chips.
- **This week** — bar chart from raw daily totals (not amortized).
- **By category** — bars from server amortized totals for current month.
- **Upcoming** — next 3 months’ liabilities (amortized + auto-pays).
- Pull-to-refresh style **refresh** on budget summary.

### History

- All transactions grouped by **month → day** (Today / Yesterday labels).
- **Search** by category; filter All / Expenses / Income.
- **Edit** manual transactions; **delete** (not auto-billed rows).
- Month headers show income/out totals.

### Settings

| Section | Purpose |
|---------|---------|
| Budget & income | Monthly income, budget cap (stored), starting rollover |
| Categories | Add/remove; reassign txs when deleting in-use category |
| Auto-pay | Recurring bills (name, amount, billing day 1–31) |
| Backup & restore | Export/import JSON |
| Account & privacy | In-app policy, **delete account** (all data removed) |

---

## Safe to Spend (concept)

Traditional apps compare spend to a fixed budget. Spendly estimates **what you can still spend today** after:

1. Money you assign as **monthly income**
2. **Rollover** from previous months (surplus or deficit)
3. **Auto-pay** rules (Netflix, rent, etc.) counted for this month
4. **Spread purchases** — e.g. ₹12,000 over 12 months counts as ₹1,000/month

Logging a big one-time purchase with a 12-month spread does not wipe out this month’s safe number in one shot.

---

## Auto-pay

- Define rules in Settings (not the same as manual “Auto-Pay” category txs).
- Server creates **Auto-Pay** transactions on schedule.
- Removing a rule keeps past bills in history; future months stop billing.
- Auto-billed rows cannot be edited or deleted in History (by design).

---

## Income

- Log via income toggle on Log, or category **Income** (seeded).
- Counted in dashboard current-month income when dated this month.

---

## Offline behavior

- After at least one successful sync, you can **view** cached data offline.
- **New** expenses and settings changes queue locally and sync when online.
- Login/register require network (first-time setup).
- Banner shows offline state and pending sync count.

Details: [OFFLINE.md](OFFLINE.md).

---

## Privacy & data

- One account per username; data not shared between users.
- Export full JSON backup anytime.
- Delete account removes user, transactions, categories, auto-pays, budget row.
- In-app privacy policy; Play Store needs a hosted URL for release.

---

## Default categories (new users)

Diet, Snacks/Chai, Gym & Supplements, Travel, Outside Food, Shopping, Misc, Income.

Reserved (system): `Income`, `Auto-Pay` — managed by server logic.

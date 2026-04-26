# Premium Expense Manager: Architecture & Data Flow

This document details the internal architecture, state management lifecycle, and underlying algorithms governing the Expense App. It is designed to be the definitive reference manual for maintaining, scaling, and reading the codebase.

---

## 🏗️ System Architecture

The application is structured as a **Client-Side Single Page Application (SPA)** that runs 100% offline. 
It leverages modern reactive capabilities combined with an asynchronous IndexedDB wrapper for high-performance offline persistence.

### Tech Stack
- **Frontend Framework:** Svelte 5 (using modern `$state`, `$derived`, `$props` Runes)
- **State Management:** Svelte primitives (`writable()`, `derived()`, `get()`)
- **Persistence Layer:** `Dexie.js` (IndexedDB Wrapper)
- **Styling UI:** Tailwind CSS (Custom App Theme variables combined with arbitrary variant classes like `group-focus-within`)

---

## 🗄️ Persistence & State Hydration 

Because manipulating vast arrays of historical data synchronusly causes main-thread blocking, the app separates the **Persistence Layer** (Disk/IndexedDB) from the **Reactivity Layer** (Svelte Stores/Memory).

### Boot Sequence (`src/lib/store.ts`)
1. **Empty Mount:** On initial load, the basic `.svelte` components mount immediately, bound to empty `writable` arrays (`transactions`, `autoPays`, etc.). This guarantees `< 50ms` TTI (Time to Interactive).
2. **`initDbAndMigrate()` Execution:** 
   - A single connection to the `ExpenseAppDB` Dexie database is initialized.
   - The engine checks for legacy `zff_tx_v3` local storage properties. If they exist, it aggressively intercepts them, formats them to the new schema, bulk-inserts them natively to IndexedDB, and strips the old `localStorage` cleanly.
3. **Memory Hydration:** Svelte's stores are injected with the fully downloaded lists (`await db.transactions.toArray()`). 
4. **Auto-Pay Engine Triggered:** `runAutoBilling()` evaluates chronological skips and sequentially backfills constraints dynamically into both `IndexedDB` and Memory simultaneously.

### The Write-Through Proxy (`financeApi`)
No Svelte component talks directly to the database OR updates Svelte array references raw. They strictly call the `financeApi`. 

When a user logs an expense via `LogView.svelte`:
```typescript
await financeApi.addTransaction(...) 
// 1. Awaits deep Dexie non-blocking put: db.transactions.put(newTx)
// 2. Synchronously unshifts locally: transactions.update(...)
// Result: UI renders instantly, data ensures it is saved structurally.
```

---

## 🔄 Core Algorithms & Math Engine

The central nervous system of the financial layout relies on the `$thisMonthData` derived store. Any time `transactions` or `budgetState` changes, the graph evaluates instantaneously to redraw Safe To Spend gauges and Pie charts.

### The "Safe to Spend" Derivation Graph
The calculation strictly answers: **"How much money do I truly have left to safely spend today?"**

It builds this answer across several phases:

1. **Calculate the Active Ledger Timeframe:**
   - Evaluates the oldest transaction date logged.
   - Builds a mathematical map of active "Months" lived in the app.
   
2. **Amortization (Expense Spreading):**
   - If an expense was logged with `durationMonths = 12` (e.g. an Annual VPN). 
   - The algorithm splits the burden. Instead of deducting `-₹6000` entirely from exactly *this* month, it triggers a `for()` loop that chronologically deposits a `-₹500` deduction ghost footprint into the ledger for exactly the 12 active months surrounding it.

3. **Compute Historical Rollover:**
   - `Historical Income = (Base Income * active months lived) + Custom logged income`
   - `Historical Deficit = Sum(past amortized logic) + Sum(autopays * active months)`
   - `Dynamic Rollover = Global Offset + Historical Income - Historical Deficit`

4. **Aggregate The Final Budget Vector:**
   - **Formula:** `Assumed Income (This Month) + Dynamic Rollover Surpluses - Dedicated AutoPays Triggering This Month - Variable Dynamic Amortized Expenses Hitting This Month` = **Safe to Spend Total**.

---

## 🧩 Component Architecture Data Flow

State passes unidirectionally from the memory stores down into distinct rendering zones.

1. **`App.svelte` (Base Root Container)**
   - Manages floating absolute `bottom-nav` routing.
   - Restricts body overflow context.
   
2. **`DashboardView.svelte` Context**
   - Listens identically directly to `$thisMonthData` derivations. 
   - Unrolls `$derived.currentCategorySpending` into a mapped conic-gradient algorithm dictating the absolute visual arc geometry of the Donut Chart.

3. **`LogView.svelte` Context**
   - Isolates complex transient input states (`amountStr`, `durationMonths`) internally away from global state pools natively tracking local `$state` primitives.
   - Bridges to global logic exclusively by awaiting `handleSave()` wrapping the non-blocking `financeApi`.

4. **`ManageView.svelte` Context**
   - The authoritative mutation interface for the `budgetState` logic arrays structure and mapping overrides (`AutoPay`, `Categories`).
   - Handles the absolute `Factory Reset` wiping process natively wiping active `IndexedDB` properties gracefully.

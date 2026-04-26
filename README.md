# Premium Expense Manager (Fintech Grade)

A highly polished, privacy-first personal finance application modeled after premium fintech experiences. Designed completely offline-first, this app utilizes **IndexedDB (Dexie.js)** to handle vast, multi-year transaction data arrays instantaneously while syncing beautifully smoothly up to **Svelte 5** reactive elements.

## 🚀 Features

### 1. The "Safe to Spend" Engine
Unlike traditional budgeting apps that just track expenses against an arbitrary limit, this app dynamically calculates your actual "guilt-free" spending capacity in real time based on:
- **Assumed Monthly Income**
- **Rollover Surplus/Deficit** from historical performance
- **Upcoming Auto-Pays** guaranteed to occur this month
- **Amortized Variable Spends** spread continuously across several months

### 2. High-End Glassmorphism Aesthetics
We stripped back standard boundaries. The visual language relies heavily on iOS-inspired transparent materials:
- **Floating Navigation Capsule:** Drop-shadow pill layout with micro-animations.
- **Glass Numpad:** Boundary-free input system wrapping massive typography and inner glowing keys.
- **Mesh Gradients:** Subtle backlights matching transaction states (Income = Emerald, Expenses = Rose) nested beneath `<nav>` modules and dashboard headers.

### 3. Expense Spreading (Amortization)
Buy an Annual VPN for ₹6,000? Log it with a **12-month spread**. The engine dynamically splits the burden into ₹500 chunks internally distributed throughout the following 12 months, preventing massive single-day purchases from instantly destroying your current month's "Safe to Spend" budget psychologically.

### 4. Background Auto-Billing
Declare an "Auto-Pay" variable (e.g. Netflix, Wifi) with a set billing date. If you don't open the app for 3 months, the system actively runs `runAutoBilling()` on boot via Dexie.js bulk-inserts, instantly mapping exactly how many months you missed and recursively billing them sequentially into your ledger so you never miss recurring data.

### 5. Advanced Database Architecture (Offline Safety)
We utilize `Dexie.js` strictly as a lightning-fast data warehouse. All UI elements hydrate rapidly on boot to reactive Svelte 5 `$state` stores. This enables components to render instantly (zero-blocking main-thread lag) while saving your data securely in Chrome's non-volatile persistent storage safely in the background.

---

## 🛠️ Tech Stack & Dependencies

- **Framework:** Svelte 5 (Utilizing modern `$state` and `$derived` execution runes)
- **Styling:** TailwindCSS 
- **Database:** Dexie.js (IndexedDB wrapper)
- **Icons:** lucide-svelte
- **Bundler:** Vite

## 📥 Local Development

To clone and run the application locally:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## 🧠 File Structure Guide

### Application Logic Layer
- **`src/lib/store.ts`:** The literal brain of the app. Initializes `ExpenseAppDB` (Dexie) local tables and migrates any archaic `localStorage` users upon initial boot. Centralizes calculation for deriving `SafeToSpend` arrays, and serves as our global proxy proxy pushing async interactions to the DB layer seamlessly.

### Aesthetic Rendering Layer
- **`src/App.svelte`:** Our master layout wrapper establishing the floating navigation absolute capsule and top-level constraints.
- **`src/app.css`:** Tailwinds injection module controlling our core hex environment properties (`[--color-dark-surface]`).

### Specialized Component Modules
- **`DashboardView.svelte`:** Renders the "Safe to Spend" gauge glass-halo arrays, Dynamic upcoming liability lists, and real-time donut spending distributions.
- **`LogView.svelte`:** The operational data entry layer. Couples deeply active UI chips inside a date-picker constraint grid.
- **`Numpad.svelte`:** A highly sophisticated iOS wallet-emulating tactile number entry module.
- **`HistoryView.svelte`:** Transaction chronological rendering grouped algorithmically by Month → Day with micro-deletion handling.
- **`ManageView.svelte`:** Configuration zone governing Math constraints, Autopays mapping arrays, and JSON structural imports/exports. Contains the highly destructive "Danger Zone".

## 🔒 Data Privacy & Management

- **Completely Offline:** This application utilizes IndexedDB (`db.transactions`, `db.autoPays`, etc.). No tracking scripts. No network backend polling. Your net worth strictly resides in your local browser index layer.
- **Export/Import JSON:** Utilize the settings module to manually back up your structural array history anywhere as raw readable JSON text data to easily migrate device to device safely. 

*Designed locally. Programmed autonomously.*

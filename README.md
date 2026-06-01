# Premium Expense Manager (Fintech Grade)

A highly polished, personal finance application modeled after premium fintech experiences. Originally built as an offline-first app, it has been **fully upgraded to a Client-Server Architecture** utilizing a modern **React + FastAPI + PostgreSQL** stack to ensure robust data security, scalability, and seamless cross-device synchronization while preserving its signature instant, "zero-friction" feel.

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
- **Mesh Gradients:** Subtle backlights matching transaction states (Income = Emerald, Expenses = Rose) nested beneath components.

### 3. Expense Spreading (Amortization)
Buy an Annual VPN for ₹6,000? Log it with a **12-month spread**. The Python math engine dynamically splits the burden into ₹500 chunks internally distributed throughout the following 12 months, preventing massive single-day purchases from instantly destroying your current month's "Safe to Spend" budget psychologically.

### 4. Background Auto-Billing & Scheduling
Declare an "Auto-Pay" variable (e.g., Netflix, Wifi) with a set billing date. The FastAPI backend utilizes **APScheduler** to run automated tasks daily at midnight, instantly injecting recurring transactions into your ledger securely on the server-side.

### 5. Optimistic UI & JWT Authentication
Protected by **OAuth2 JWT Token Authentication**, your financial data is completely private. Despite the client-server separation, the frontend utilizes **TanStack React Query's Optimistic Mutations** to instantly update the UI (zero-blocking main-thread lag) before the server even responds, preserving the app's lightning-fast offline-first roots.

---

## 🛠️ Tech Stack & Dependencies

### Frontend
- **Framework:** React 18 + TypeScript
- **State & Data Fetching:** TanStack React Query (`@tanstack/react-query`)
- **Styling:** Tailwind CSS v4
- **Icons:** lucide-react
- **Bundler:** Vite

### Backend
- **Framework:** Python 3 + FastAPI
- **Database:** SQLite (local dev) or PostgreSQL (production)
- **ORM & Migrations:** SQLAlchemy + Alembic
- **Authentication:** JWT (python-jose, bcrypt)
- **Background Tasks:** APScheduler

---

## 📥 Local Development Setup

### 1. Backend Setup
Ensure you have Python 3.10+ installed.

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Configure your environment variables (.env)
cp .env.example .env
# Default uses SQLite — no database server required for local dev

# Run database migrations (optional — tables are also created on startup)
alembic upgrade head

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
> **Note:** The backend Swagger API documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup
In a new terminal window:

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
> **Note:** The frontend application will be available at `http://localhost:5173`. API requests are proxied to the backend at port 8000.

### 3. First Use
1. Open `http://localhost:5173` in your browser.
2. **Register** a new account (or sign in if you already have one).
3. Start logging expenses — all data is stored on the server.

### 4. Android / Play Store
See **[docs/PLAY_STORE.md](docs/PLAY_STORE.md)** for the full publication guide.

```bash
cd frontend
echo "VITE_API_URL=https://your-api.com/api" > .env.production
npm run build
npx cap sync
npm run cap:android   # opens Android Studio → build signed AAB
```

---

## 🧠 Architecture Guide

### Backend Layer (`/backend`)
- **`app/main.py`:** The FastAPI entry point, configures CORS, custom OpenAPI Swagger UI documentation, and initializes the APScheduler background tasks.
- **`app/services.py`:** The mathematical brain of the app. Houses the complex `calculate_dashboard` logic responsible for calculating amortized burdens and rolling safe-to-spend arrays over multi-month boundaries.
- **`app/auth.py`:** Handles JWT creation, password hashing, and user authentication dependencies.
- **`app/routers/`:** Modularized REST API endpoints for transactions, categories, budgets, and dashboard data.

### Frontend Layer (`/frontend`)
- **`src/lib/api.ts`:** Axios client configured to automatically handle JWT injection into the `Authorization` headers.
- **`src/lib/hooks.ts`:** The critical optimistic UI layer. Custom React Query hooks intercept mutations (like deleting or adding an expense) to artificially snap the UI immediately to its predicted state for zero-latency user feedback.
- **`src/lib/LogView.tsx`:** The highly optimized tactical data-entry module utilizing the Numpad component.
- **`src/lib/DashboardView.tsx`:** Renders the "Safe to Spend" gauge arrays and complex data visualizations via React `useMemo` hooks mapping directly over server state.

---
*Designed locally. Programmed autonomously.*

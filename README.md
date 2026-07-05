# Shanjive Tex — Employee Management Application

A production-grade HRMS/ERP for Shanjive Tex (textile company).

Built with: React 18 + Vite, Supabase (PostgreSQL + Auth + Storage), React Router v6, Chart.js.

---

## Prerequisites

- Node.js 18+
- A Supabase project with the schema already deployed
- npm (bundled with Node.js)

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd employment-management-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
# Copy the example file
cp .env.example .env
```

Then open `.env` and fill in your real Supabase values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ **Never commit `.env`** — it is gitignored. Only `.env.example` (with placeholder values) is committed.  
> Find your values at: **Supabase Dashboard → Your Project → Settings → API**

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Building for Production

```bash
npm run build
```

This generates a `dist/` folder. The `dist/` folder is what you deploy to Netlify.

> ✅ **Vite automatically inlines all `VITE_*` environment variables from `.env` during the build.** The built `dist/` folder has the Supabase credentials baked in — no Netlify environment variable configuration is required.

---

## Deploying to Netlify (Manual Drag-and-Drop)

This project uses **manual deploy** — no CI/CD, no Netlify CLI, no GitHub integration.

### Steps

1. Run `npm run build` locally.
2. Go to [netlify.com](https://netlify.com) → your site → **Deploys** tab.
3. Drag the `dist/` folder onto the deploy dropzone, **or** click "browse to upload" and select the `dist/` folder.
4. Netlify publishes it instantly.

### SPA Routing (automatic)

`public/_redirects` contains:
```
/*    /index.html   200
```

Vite copies the entire `public/` folder into `dist/` at build time, so the `_redirects` file will always be present in every deployment. This ensures React Router works correctly after a page refresh — no manual step needed.

---

## Role Access Overview

| Role | Access |
|------|--------|
| **Super Admin** | All modules including Payroll, Settings, Admin Management |
| **Admin** | Dashboard, Employees, Attendance, Leave, Inventory, Reports (no payroll) |
| **Employee** | Self-service (future — not built yet) |

> Payroll, Settings, and Admin Management are enforced at the **database RLS layer** (`is_super_admin()` policy), not just hidden in the UI. An Admin-role session will receive zero rows from payroll tables regardless of what API call is made.

---

## Project Structure

```
src/
├── assets/
├── components/
│   ├── common/       # Button, Input, Modal, Table, Badge, Pagination, etc.
│   ├── layout/       # Sidebar, Navbar, ProtectedRoute, RoleRoute
│   └── modules/      # Feature-specific composite components
├── context/          # AuthContext.jsx, PermissionContext.jsx
├── hooks/            # useAuth, usePermission, usePagination, useDebounce
├── layouts/          # DashboardLayout.jsx, AuthLayout.jsx
├── lib/              # supabaseClient.js
├── pages/            # Route-level pages (one folder per module)
├── routes/           # routes.jsx, ProtectedRoute.jsx, RoleRoute.jsx
├── services/         # All Supabase data access (one file per domain)
├── styles/           # global.css, variables.css
└── utils/            # formatters.js, validators.js, permissionUtils.js, constants.js
```

---

## Architecture Rules

1. **Pages** compose components and call `services/*` only. Zero business logic in page files.
2. **All Supabase calls** live exclusively in `services/`. No component imports `supabaseClient` directly except `context/AuthContext.jsx` and `services/*`.
3. **Soft deletes** — never call `.delete()` on `employees`, `departments`, `designations`, `inventory_items`, or `app_users`. Always `.update({ deleted_at: new Date().toISOString() })`.
4. **Activity logging** — always `supabase.rpc('log_activity', {...})`. Never insert into `activity_logs` directly.
5. **DB-managed fields** — never write `working_hours`, `overtime_hours`, `used_days`, `gross_salary`, `net_salary`, or `employee_code` from the frontend. These are maintained by database triggers or generated columns.

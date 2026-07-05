# 🏭 Shanjive Tex Employee Management System (EMS)

### Human Resource Management System (HRMS)

A Human Resource Management System (HRMS) developed by **Aswin Ravivarman** for **Shanjive Tex**, a TFO doubling unit textile manufacturing company.

The application centralizes employee management, attendance tracking, leave records, payroll processing, salary advances, reporting, and role-based access control into a secure, responsive web application.

---

## 🌐 Live Application

**Application:** https://shanjivetex.netlify.app

> **Note**
> This is a production application developed for Shanjive Tex. Access is restricted to authorized users only. Public registration and demo accounts are not available.

---

## 🏭 Real-World Client Project

This application was developed as a real-world HRMS solution for Shanjive Tex, replacing manual, spreadsheet-based HR workflows with a centralized web application for managing:

- Employee Information
- Attendance
- Leave Records
- Payroll
- Salary Advances
- Administrative Reports
- User Permissions

Built with **React**, **Vite**, and **Supabase**, with an emphasis on security, maintainability, and ease of administration for non-technical office staff. The interface is fully responsive and usable on mobile and tablet devices as well as desktop.

---

## 🔐 Access Model

The application is **not publicly accessible**. User accounts are created only by the Super Admin.

- ❌ No public registration
- ❌ No demo account
- ❌ No employee self-registration

The Super Admin is responsible for creating Admin accounts, assigning permissions, and managing overall system access. Visitors reaching the application without valid credentials see only the login page.

---

## 📖 Overview

The application enables administrators to:

- Manage employee information
- Record daily attendance
- Maintain leave records
- Process monthly payroll
- Manage salary advances
- Generate administrative reports
- Control user permissions using Role-Based Access Control (RBAC)

---

## ✨ Features

### 👨‍💼 Employee Management

- Employee registration and profiles
- Department and designation assignment
- Bank details and emergency contact information
- Search and filter employees
- Soft delete (archive), preserving records rather than permanently removing them

### 🕒 Attendance Management

- Daily attendance entry: present, absent, half day
- Late arrival and early exit tracking
- Overtime tracking
- Shift assignment
- Attendance search and filtering

### 📝 Leave Records

- Configurable leave types and annual quotas
- Leave balance tracking per employee
- Leave entries are recorded and updated directly by the Super Admin — there is no separate employee-facing request/approval workflow

### 💰 Payroll Management

- Monthly payroll runs
- Configurable salary structures and components, with salary history preserved over time (each salary revision is tracked by effective date rather than overwritten)
- Overtime and deduction handling
- Net salary calculation
- Payslip generation
- Wages summary reporting

Payroll data is restricted to users explicitly granted payroll-related permissions.

### 💵 Salary Advances

- Recording employee salary advances
- Outstanding balance tracking
- Advance settlement management
- Employee-wise advance history

### 📊 Reports

- Attendance dashboard report
- Leave analytics report
- Duty summary report (including advance outstanding, where permitted)
- Wages & salary sheet report

Reports are exportable as PDF, Excel, and Word documents, gated by the same permission system used elsewhere.

### ⚙️ Company Settings

- Company profile (name, address, contact details), including the company logo bundled as a static frontend asset
- GST / PAN details
- Working days configuration
- Salary rule configuration

### 📋 Activity Logs

The system records key administrative actions (e.g. employee changes, payroll generation) for accountability. This is application-level logging intended for internal reference, not a database-enforced audit trail.

---

## 🔐 Role-Based Access Control (RBAC)

Every user account is assigned a role, and access is enforced both in the interface and at the database level via Row Level Security.

### 👑 Super Admin

Unrestricted access to the entire system, including:

- All employee, attendance, leave, payroll, and advance management
- Company settings configuration
- Creating and deactivating Admin accounts
- Granting and revoking individual permissions
- Viewing activity logs

### 👨‍💼 Admin

Admin accounts are created only by the Super Admin. Each Admin receives permissions individually and independently, for example:

- View / Add / Edit / Archive Employees
- View / Manage Attendance
- View / Manage Leave Records
- View / Manage Salary Advances
- View Reports

Payroll-related permissions are restricted by default and must be explicitly granted.

### 🔒 Permission-Based Security

Rather than granting every administrator full access, the system uses independent, per-module permissions (e.g. Employee Management, Attendance, Leave, Advances, Payroll, Reports, Settings) that the Super Admin can toggle individually for each Admin account at any time.

---

## 🛠 Tech Stack

**Frontend**
- React 18
- Vite
- React Router
- JavaScript (ES6+)
- Context API
- CSS3 (responsive, mobile-friendly layout)

**Backend**
- Supabase (PostgreSQL, Authentication, Row Level Security, SQL functions)

**Database**
- PostgreSQL with a normalized relational schema
- Foreign key constraints
- Row Level Security policies enforcing permission-based access
- Soft-delete support on key tables

**Deployment**
- Netlify

---

## 🏗 Application Architecture

```
React (Frontend)
        │
        ▼
 Supabase Authentication
        │
        ▼
 PostgreSQL Database
        │
        ▼
 Row Level Security (RLS)
```

The frontend communicates with Supabase using authenticated requests. All Supabase data access is centralized in the `src/services/` layer, and sensitive operations are enforced using database-level RLS policies in addition to interface-level permission checks.

---

## 📂 Project Structure

```text
src/
├── assets/        # Images, icons, and static assets (including company logo)
├── components/    # Reusable UI components
├── context/       # Authentication & Permission context
├── hooks/         # Custom React hooks
├── layouts/       # Application layouts
├── lib/           # Supabase client setup
├── pages/         # Application pages, grouped by module
├── routes/        # Route definitions and protected routes
├── services/      # Centralized Supabase data access
├── styles/        # Global styles
└── utils/         # Shared constants and helper functions
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm
- A Supabase project

### Clone the Repository

```bash
git clone https://github.com/aswin-ravivarman/shanjive-tex-employee-management.git
cd shanjive-tex-employee-management
```

### Install Dependencies

```bash
npm install
```

---

## 🔑 Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then fill in your Supabase project credentials in `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

These values are available in your Supabase Dashboard under **Project Settings → API**.

> **Important**
> Only the anonymous/public key should ever be used here. Never commit `.env` or the Supabase service role key to version control.

---

## ▶ Running the Project

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## 🌍 Deployment

The application is deployed via Netlify.

1. **Build the application**
   ```bash
   npm run build
   ```
   This generates a production-ready `dist/` folder.

2. **Deploy to Netlify**
   Deploy the `dist/` folder manually (drag-and-drop) or connect the GitHub repository for automatic deployments.

3. **Configure environment variables** (if using connected Git deploys)
   Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify's site settings. For drag-and-drop deploys, these values are baked in at build time from your local `.env`.

4. **Configure redirects**
   Ensure a `_redirects` file exists in `public/` (copied into `dist/` on build) so client-side routing works correctly:
   ```
   /*  /index.html  200
   ```

5. **Configure Supabase Auth**
   Add the deployed site URL to **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**.

---

## 🔒 Security

- Supabase Authentication for user sessions
- PostgreSQL Row Level Security (RLS) enforcing permission-based data access at the database level
- Permission-based UI rendering, matched to underlying RLS policies
- Role-based authorization (Super Admin / Admin)
- Environment variables excluded from version control
- Only the Supabase anonymous key is ever exposed to the client; the service role key is never used in the frontend

---

## 📈 Future Enhancements

Realistic next steps achievable as a solo developer, building on the current stack:

- Employee self-service portal (view-only payslips and attendance for individual employees)
- Email notifications (e.g. payroll generated, leave recorded)
- Dashboard analytics and charts for attendance/payroll trends
- QR code-based attendance check-in
- One-click data export/backup from within the app

---

## 📌 Disclaimer

This repository documents the architecture, design, and implementation of a real-world client project. Any screenshots or sample data referenced in the future will use fictional information to protect the privacy of the client and its employees. The live application is intended only for authorized users of Shanjive Tex.

---

## 📄 License

**Proprietary Software**
Developed by Aswin Ravivarman for Shanjive Tex as a real-world client solution. The source code is shared for portfolio and educational purposes only. Unauthorized commercial use, redistribution, modification, or reproduction without permission is prohibited.

---

## 👨‍💻 Author

**Aswin Ravivarman**
GitHub: https://github.com/aswin-ravivarman

---

## 🤝 Contributing

This repository is maintained as a portfolio project. External contributions are not currently accepted.

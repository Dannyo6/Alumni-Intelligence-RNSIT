<div align="center">
  <h1>🎓 RNSIT Alumni Dashboard</h1>
  <p><b>Secure Identity Management & Alumni Record Portal</b></p>
  <p>
    <img src="https://img.shields.io/badge/Frontend-React.js-61DAFB?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind" />
  </p>
</div>

<br/>

> **RNSIT Alumni Dashboard** is a centralized, access-controlled web application designed to manage, verify, and query alumni records. Built on a modern React frontend and powered by a Supabase PostgreSQL backend, it ensures strict data isolation and secure user authentication for the RNS Institute of Technology alumni network.

---

## 🏗 System Architecture

The platform utilizes a decoupled architecture, relying on **Supabase** as a Backend-as-a-Service (BaaS) to handle identity verification, token issuance, and data persistence without requiring a custom middleware server.

| Layer | Technology | Responsibility |
| :--- | :--- | :--- |
| **Client UI** | `React` & `Vite` | Dynamic routing, responsive state management, and user-facing dashboards. |
| **Identity** | `Supabase Auth` | Issues secure JWTs (JSON Web Tokens) upon successful login for authenticated sessions. |
| **Data Engine** | `PostgreSQL` | Relational storage for alumni profiles, processing bulk workbook imports and complex queries. |
| **Security** | `Row Level Security` | Database-level policies physically preventing unauthorized read/write operations. |

---

## 🚀 Core Features

* 🔐 **Secure Authentication:** Frictionless user login and session management powered by Supabase Auth.
* 🛡️ **Zero-Trust Data Security:** Enforces PostgreSQL Row Level Security (RLS) to guarantee that alumni can only modify their own profiles, eliminating unauthorized data tampering.
* 📂 **Database Workbook Imports:** Administrative capabilities to seamlessly ingest and map bulk legacy alumni records into the live database.
* ⚡ **Real-Time Data Sync:** Instant UI updates and fluid record querying directly from the backend.
* 📊 **Automated Benchmarking:** Built-in Puppeteer scripts (`/puppeteer_test`) to measure render performance and simulate high-load stress testing.

---

## ⚙️ Local Deployment & Execution

Getting the local development environment running requires standard Node.js tooling and your Supabase project keys.

```bash
# 1. Clone the repository
git clone [https://github.com/Dannyo6/Alumni-Intelligence-RNSIT.git](https://github.com/Dannyo6/Alumni-Intelligence-RNSIT.git)
cd Alumni-Intelligence-RNSIT/frontend

# 2. Install dependencies
npm install

# 3. Configure Environment Variables
cp .env.example .env
# Update .env with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Boot the development server
npm run dev
```

# Project Handoff: RNSIT Alumni Intelligence Dashboard

## 📌 Context
This repository contains the **RNSIT Alumni Intelligence Portal**. 
We have just successfully completed a semantic reconciliation and merge of the `danny` branch into `bhuvi` (which remains the active integration branch).

- **Current Branch**: `bhuvi`
- **Git Status**: Fully committed, clean working tree, `origin/danny` successfully merged.
- **Current Test Suite**: **214/214 Vitest tests passing**.
- **Build Status**: Compiles with `0 TypeScript errors` and `0 oxlint errors`.

---

## 🏗️ Reconciled Architecture (The Source of Truth)

The merged application combines **Bhuvi's Premium UI/UX visual style** with **Danny's hardened production architecture and security contracts**. 

### 1. Backend / Database / Supabase Schema (Authoritative)
* **Single Source of Truth**: The live Supabase database running **Schema v1** is the sole source of truth. 
* **Tables**: The primary alumni table is `public.alumni`. 
* **Legacy Tables Wiped**: Legacy prototype concepts (like `admin_users`, browser-based `sync_history`, or separate alumni category tables) are completely deprecated and must **never** be restored.
* **RLS**: Row-Level Security is fully active on Supabase.
* **Excel Data**: The Excel workbook is purely an initial bulk import source. There is no direct browser-side syncing. All operations go through the server-side pipeline.

### 2. Authentication & Authorization (Admin-Only Model)
* **No Viewer Role**: The platform has been hardened to be **strictly admin-only**. The viewer role is obsolete. 
* **Auth Guarding**: Any user who is authenticated must have an explicitly approved, active profile (`is_active = true` and `role = 'admin'` in `public.profiles`) to access the dashboard. Stale concepts like viewer selection dropdowns, user privileges switching, and viewer badges have been stripped out.
* **Stale Async Sequence Protection**: `AuthContext.tsx` contains protection against out-of-order async authorization states, isolating query caching on logout or account switches (`queryClient.clear()`).
* **Error Handling**: Authentication/Authorization failures trigger the custom `ErrorBoundary` or show a dedicated Auth Error UI with explicit Sign Out/Retry pathways.

### 3. Duplicate Resolution Governance
* **Strict RPC Constraint**: Resolving duplicate candidate entries **must only** invoke the Postgres RPC function:
  `admin_resolve_duplicate_candidate(...)`
* **No Direct Writes**: Direct table updates (`.from('duplicate_candidates').update(...)`) are prohibited and have been removed.

### 4. UI/UX Design System (`frontend/src/components/ui/`)
All pages consume Bhuvi's premium custom UI system:
* **Theming**: Dark/Light mode theme system supported by `ThemeContext.tsx` and custom `@theme` variables in `index.css`.
* **Visual Primitives**: Custom visual wrappers like `Card`, `Drawer` (slide-out side panel used for profile details), `Modal`, `FilterChip`, `Stepper` (bulk import guide), and `StatTile`.
* **Motion**: Smooth entrance transitions (`FadeIn`, `Stagger`).
* **Reduced Motion**: Respects `prefers-reduced-motion: reduce` by instantly bypassing animation durations and scaling down layout transform animations.
* **Command Palette**: Universal lookup palette (`Ctrl/Cmd + K`) for quick page navigations.

---

## 📂 Key Files & Directories

* `frontend/src/App.tsx`: Reconciled router utilizing the strict 6-stage auth state machine.
* `frontend/src/contexts/AuthContext.tsx`: Manages active sessions and clears Query cache on switch/sign-out.
* `frontend/src/pages/Admin.tsx`: Reconciled dashboard operations (approved administrators audit logs, import histories, verification queues).
* `frontend/src/pages/Login.tsx`: Premium animated split-pane constellation sign-in layout.
* `frontend/src/components/ui/`: Standardized custom visual primitives.
* `frontend/src/tests/`: Reconciled test suite containing 214 test assertions (including `duplicateResolution.test.ts`, `productionHardening.test.ts`, `shellNavigation.test.ts`, `entryExperience.test.ts`).

---

## 🛠️ Verification & Building

Ensure you run these verification commands before staging modifications:

```bash
cd frontend

# Start Development Server (Vite)
npm run dev

# Run Vitest Suite (Expect 214 tests to pass)
npm run test -- --run

# Run TypeScript Validation
npx tsc -b

# Run Linter
npx oxlint

# Run Production Build
npm run build
```

---

## 🎯 Next Steps

1. **Phase 10F.9 - Responsive + Accessibility + Final Visual QA**:
   - Audit the combined visual state under mobile viewports.
   - Verify layout responsiveness across the drawer interfaces, the `CommandPalette`, and the light/dark transition values.
   - Check keyboard navigation controls on interactive nodes.
2. **Phase 11 - Final Deployment & Acceptance**:
   - Production deployment procedures (do **not** deploy schema updates manually).

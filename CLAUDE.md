# MAO Systems — Clinic Management System
# READ THIS ENTIRE FILE before writing any code.
# This file is the source of truth for all architectural decisions.

## Project
Multi-tenant SaaS for private clinics and medical offices in Lima, Peru.
Brand: MAO Systems | Product: Clinova | URL: maosystems.io
One codebase, many clinics. Each clinic = one tenant, fully isolated.

## Monorepo structure
mao-clinics/
├── apps/
│   ├── frontend/          # React 18 + Vite + TypeScript + Tailwind + React Query
│   └── backend/           # Node.js 20 + Express 5 + TypeScript + Prisma
├── packages/
│   └── shared/            # shared TypeScript types (no logic)
├── .claude/
│   └── commands/          # custom slash commands
├── docker-compose.yml     # PostgreSQL 16 + Redis 7 for local dev
├── CLAUDE.md              # this file
└── .env                   # never commit this

## Tech stack
Frontend:  React 18, Vite, TypeScript, TailwindCSS, React Query v5, React Router v6
Backend:   Node.js 20, Express 5, TypeScript, Prisma ORM
Database:  PostgreSQL 16 (Docker local / AWS RDS prod)
Cache:     Redis 7 (Docker local / AWS ElastiCache prod)
Storage:   Local ./uploads in dev / AWS S3 in prod (STORAGE_PROVIDER=local|s3)
Deploy:    Vercel (frontend) + AWS EC2 t3.small (backend)
Auth:      JWT in httpOnly cookies + refresh tokens
IDs:       UUID v4 on every table — never auto-increment integers

## Multi-tenancy — CRITICAL RULES
RULE 1: ALWAYS filter every DB query by tenant_id. No exceptions.
RULE 2: tenant_id comes ONLY from req.tenantId (set by middleware from JWT).
RULE 3: NEVER trust tenant_id from request body, params, or query string.
RULE 4: Every Prisma model MUST have tenantId field with index.

Middleware flow:
  Request → authenticateJWT → setTenantMiddleware → roleGuard → handler
  authenticateJWT   : verifies JWT cookie, sets req.user
  setTenantMiddleware: sets req.tenantId = req.user.tenantId
  roleGuard(roles[]) : checks req.user.role is in allowed roles

## Theming system
Each tenant has theme_config (JSON) in the tenants table:
  primary, primary_light, primary_dark, secondary, secondary_light,
  surface, sidebar_bg, sidebar_text, border_radius, logo_url

On login → GET /api/v1/auth/me returns tenant + theme_config
Frontend useTenant() hook injects CSS variables into document.documentElement
TailwindCSS extends colors with these CSS variables
Admin panel /admin/settings has ThemeEditor with 6 preset palettes + free pickers

Preset palettes (rubro → colors):
  general    : primary #1A5F9E  secondary #2EAA6E  sidebar #1A2740
  dental     : primary #0088CC  secondary #FF6B35  sidebar #004E75
  gynecology : primary #9B4D96  secondary #E8729A  sidebar #5C2D6B
  pediatrics : primary #F5A623  secondary #3DB8A0  sidebar #1A4A42
  ophthalmology: primary #1C3557 secondary #00B4D8 sidebar #0F1E31
  traumatology: primary #2C4A6E secondary #E84855  sidebar #18283D

## Modules
1. auth          → login, refresh, logout, /me. Roles: admin, doctor, receptionist
2. patients      → CRUD, DNI search (8 digits), medical history timeline
3. appointments  → FullCalendar TimegridWeek, availability slots, status flow
4. records       → consultation notes (Tiptap), ICD-10 autocomplete, prescriptions, S3 attachments
5. billing       → invoices PDF (BILLING_PROVIDER=mock|nubefact)
6. reminders     → WhatsApp 24h before appointment (WHATSAPP_PROVIDER=mock|meta)
7. dashboard     → KPI cards + Recharts bar + donut charts
8. admin         → users, doctors, tenant config, ThemeEditor, logo upload

## API conventions
Base URL   : /api/v1
Auth routes: /api/v1/auth/{login|refresh|logout|me}
Resources  : /api/v1/{module}/{resource}

Success response:
  { success: true, data: {...} }
  { success: true, data: [...], meta: { page, limit, total, totalPages } }

Error response:
  { success: false, error: { code: "SNAKE_CASE_CODE", message: "Human readable" } }

HTTP status codes:
  200 OK | 201 Created | 400 Bad Request | 401 Unauthorized
  403 Forbidden | 404 Not Found | 409 Conflict | 500 Internal Server Error

## Database conventions
All table names  : snake_case plural (patients, appointments, consultations)
All column names : snake_case (tenant_id, first_name, created_at)
Timestamps       : created_at, updated_at on every table (Prisma @updatedAt)
Soft deletes     : deleted_at nullable (never hard delete patient/medical data)
Money fields     : Decimal(10,2) — NEVER float

## Appointment status flow
pending → confirmed → in_progress → completed → cancelled
                                              ↘ no_show

## Code conventions
Language      : TypeScript strict mode everywhere
Validation    : Zod schemas in backend BEFORE any DB operation
Error handling: try/catch in every async route handler, use next(error)
Imports       : absolute paths with @ alias (@/components, @/lib, @/hooks)
Env vars      : always access via process.env.VAR_NAME, never hardcode
Logging       : console.error for errors in dev, add winston in prod later
Comments      : English only, explain WHY not WHAT

## Security rules
- NEVER expose password_hash in any response
- NEVER log sensitive data (passwords, tokens, DNI)
- ALWAYS use Prisma parameterized queries (never raw SQL with interpolation)
- Rate limit auth endpoints: 5 attempts per 15 min per IP
- httpOnly cookies for JWT — never localStorage
- CORS: only allow FRONTEND_URL origin

## Provider pattern (Strategy)
BILLING_PROVIDER=mock   → generates PDF locally with pdfkit (no SUNAT call)
BILLING_PROVIDER=nubefact → calls Nubefact API (production)

WHATSAPP_PROVIDER=mock  → marks reminder_sent=true, shows badge in UI only
WHATSAPP_PROVIDER=meta  → calls Meta Cloud API (production)

STORAGE_PROVIDER=local  → saves files to ./uploads/ folder
STORAGE_PROVIDER=s3     → uploads to AWS S3 bucket

## Key dependencies
# Backend
express, prisma, @prisma/client, zod, jsonwebtoken, bcryptjs,
express-rate-limit, helmet, cookie-parser, cors, multer,
pdfkit, node-cron, decimal.js, uuid, date-fns-tz

# Frontend
react, react-router-dom, @tanstack/react-query, axios,
@fullcalendar/react, @fullcalendar/timegrid, @fullcalendar/interaction,
@tiptap/react, @tiptap/starter-kit, recharts, react-hook-form,
zod, @hookform/resolvers, date-fns, dayjs

## Dev commands
pnpm dev          → starts frontend (port 5173) + backend (port 3001) concurrently
pnpm db:up        → docker compose up -d (PostgreSQL + Redis)
pnpm db:migrate   → npx prisma migrate dev
pnpm db:seed      → npx ts-node prisma/seed.ts
pnpm db:studio    → npx prisma studio (visual DB browser at localhost:5555)
pnpm db:reset     → drops and recreates DB + runs seed (destructive!)
pnpm build        → production build of both apps
pnpm typecheck    → tsc --noEmit on both apps

## What to do when asked to create a new module
1. Add Prisma model to schema.prisma with tenantId + timestamps + soft delete
2. Run: npx prisma migrate dev --name add_{module}
3. Create backend: apps/backend/src/modules/{module}/
   - {module}.routes.ts   (Express router)
   - {module}.service.ts  (business logic, all DB calls here)
   - {module}.schema.ts   (Zod validation schemas)
   - {module}.types.ts    (TypeScript interfaces)
4. Register router in apps/backend/src/index.ts
5. Create frontend: apps/frontend/src/features/{module}/
   - hooks/use{Module}.ts     (React Query hooks)
   - components/{Module}Table.tsx
   - components/{Module}Form.tsx
   - pages/{Module}Page.tsx
6. Add route in apps/frontend/src/App.tsx
7. Add nav item in Sidebar component

## Peruvian context
DNI format     : exactly 8 digits (validate with regex /^\d{8}$/)
Phone format   : 9 digits starting with 9 (regex /^9\d{8}$/)
Currency       : PEN (Peruvian Sol, S/)
Timezone       : America/Lima (UTC-5, no DST)
Tax            : IGV 18%
Invoice series : B001 boleta, F001 factura
SUNAT API      : via Nubefact (sandbox: api.nubefact.com/api/v1)
ICD-10         : use npm package cie10-data for diagnosis autocomplete

## Business model and scaling strategy

### Model C — Shared SaaS with optional modules per tenant
One codebase. One deployment. All clients share the same backend and frontend.
Isolation is guaranteed by tenant_id on every DB table (already implemented).
Additional features are activated per tenant via feature flags — NOT separate repos.

NEVER create a separate repo per client.
NEVER deploy a separate server per client unless they have an enterprise contract.

### Feature flags system
Each Tenant has a `features` JSON field in the DB.
Example: { "lab_integration": true, "telemedicine": false, "multi_location": true }

Backend check: use hasFeature(tenant, 'flag_name') before executing premium module logic.
Frontend check: use useFeatureFlag('flag_name') before rendering premium UI elements.

If a feature flag is missing or false → throw AppError("FEATURE_NOT_ENABLED", 403)
Never expose premium module routes without feature flag check.

### Adding a new module (future workflow)
1. Create apps/backend/src/modules/{module_name}/ with routes + service + schema
2. Add feature flag check at the top of every route in that module
3. Create apps/frontend/src/features/{module_name}/ with hooks + components + pages
4. Guard all UI with useFeatureFlag('{module_name}')
5. Add the flag to AVAILABLE_FEATURES constant in feature-flags.ts
6. Activate per tenant via super-admin panel or SQL: UPDATE tenants SET features = features || '{"module_name":true}'

### Current feature flags (as of this implementation)
All existing modules (auth, patients, appointments, records, billing, dashboard, admin)
are BASE modules — available to ALL tenants regardless of features JSON.
The features JSON only controls PREMIUM/OPTIONAL future modules.

### Infrastructure scaling path
Phase 1 (1-10 clients):  shared EC2 t3.small + Docker PostgreSQL + Docker Redis
Phase 2 (5+ clients):    migrate DB to AWS RDS t3.micro, Redis to ElastiCache
Phase 3 (10+ clients):   EC2 Auto Scaling Group or ECS, RDS Multi-AZ
Enterprise client:       dedicated EC2 + dedicated RDS + dedicated S3 bucket

### Pricing
Starter:      S/599/month  — 1 doctor, base modules only
Professional: S/999/month  — up to 3 doctors, base modules only
Clinic:       S/1,799/month — unlimited doctors, base modules only
+Module fee:  S/100–400/month per optional module activated

---

## SuperAdmin platform layer and demo tenants

### PlatformAdmin model
Defined in schema.prisma as a SEPARATE model — no tenant_id, no relation to User.
  - Table: platform_admins
  - Fields: id, email, password_hash, full_name, created_at, last_login_at
  - This separation is intentional: platform-level auth must never share a table,
    JWT shape, or middleware with tenant-level auth.

### Platform JWT
  - Cookie name: `platformAccessToken` (distinct from tenant `accessToken`)
  - Payload shape: `{ type: 'platform_access', sub: platformAdmin.id, email }`
  - The `requireSuperAdmin()` middleware reads ONLY the `platformAccessToken` cookie
    and rejects any JWT whose `type` is not `platform_access`.
  - A tenant admin JWT can never access platform routes even if the cookie name
    somehow collides — the type check is the final guard.

### Platform endpoints (no tenant middleware chain)
  POST /platform/auth/login       — validates PlatformAdmin, sets platformAccessToken cookie
  POST /platform/auth/logout      — clears platformAccessToken cookie
  GET  /platform/auth/me          — returns PlatformAdmin profile
  GET  /platform/tenants          — list all tenants with features JSON + plan_price_soles
  GET  /platform/tenants/stats    — MRR + active/inactive counts for dashboard
  POST /platform/tenants          — create tenant + first admin user in one transaction
  PATCH /platform/tenants/:id/features — update features JSON (merge, not replace)

### Platform frontend routes
  /platform/login        — PlatformLoginPage (own branding, own cookie)
  /platform/dashboard    — MRR + tenant counts
  /platform/tenants      — feature flag toggle panel (live PATCH per toggle, no save button)
  
  Uses PlatformProtectedRoute (separate from tenant ProtectedRoute).
  Uses platformApi.ts (separate axios instance, redirects 401 → /platform/login).
  Uses usePlatformAuth.ts hook (query key: ['platform-auth', 'me']).

### Seed commands
  pnpm seed:platform        — creates superadmin@maosystems.io / SuperAdmin2026! (run ONCE)
  pnpm seed:demo-tenants    — seeds 4 additional tenants + confirms Tenant 1 flags (idempotent)
  pnpm demo:reset           — resets ONLY Clínica San Rafael; does NOT touch other tenants

### Five demo tenants

| # | Name                      | Subdomain   | Plan         | MRR     | WhatsApp | HCE | Billing | Dashboard | Theme |
|---|---------------------------|-------------|--------------|---------|----------|-----|---------|-----------|-------|
| 1 | Clínica San Rafael        | sanrafael   | clinica      | S/1,799 | ✅       | ✅  | ✅      | ✅        | ✅    |
| 2 | Policlínico Vida Plena    | vidaplena   | profesional  | S/999   | ✅       | ✅  | ❌      | ✅        | ✅    |
| 3 | Consultorio Dr. Mendoza   | drmendoza   | starter      | S/599   | ❌       | ❌  | ❌      | ❌        | ❌    |
| 4 | Centro Médico Bienestar   | bienestar   | profesional  | S/999   | ✅       | ✅  | ❌      | ✅        | ✅    |
| 5 | Clínica Santa Lucía       | santalucia  | clinica      | S/1,799 | ✅       | ✅  | ✅      | ✅        | ✅    |

All passwords: Demo2026! | SuperAdmin: superadmin@maosystems.io / SuperAdmin2026!
Full credential table: apps/backend/DEMO_CREDENTIALS.md

### AVAILABLE_FEATURES update
Added 5 base-module toggles to feature-flags.ts for the demo:
  'whatsapp_reminders', 'hce', 'billing', 'dashboard_kpis', 'custom_theme'
These come BEFORE the premium add-on flags in the list.
Tenant.plan_price_soles (Decimal 10,2, default 0) added to schema for MRR calculation.
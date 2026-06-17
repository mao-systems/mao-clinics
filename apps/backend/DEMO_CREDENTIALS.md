# MAO Clinics — Demo Credentials

Quick reference for all logins. **Password for all tenant users: `Demo2026!`**

---

## SuperAdmin (Platform Panel)

| Role        | Email                          | Password         | URL                                         |
|-------------|--------------------------------|------------------|---------------------------------------------|
| SuperAdmin  | superadmin@maosystems.io       | SuperAdmin2026!  | http://localhost:5173/platform/login        |

---

## Tenant 1 — Clínica San Rafael (full demo, all modules ON)

**Subdomain:** `sanrafael` | **Plan:** Clínica | **MRR:** S/ 1,799  
**Features:** ✅ WhatsApp · ✅ HCE · ✅ Billing · ✅ Dashboard KPIs · ✅ Custom theme  
**Data:** 50 patients · 60 appointments · ~16 consultations · ~6 invoices · 3 doctors

| Role          | Email                                    | Password  |
|---------------|------------------------------------------|-----------|
| Admin         | admin@sanrafael.maosystems.io            | Demo2026! |
| Doctor 1      | dr.garcia@sanrafael.maosystems.io        | Demo2026! |
| Doctor 2      | dr.mendoza@sanrafael.maosystems.io       | Demo2026! |
| Doctor 3      | dr.quispe@sanrafael.maosystems.io        | Demo2026! |
| Recepcionista | recepcion@sanrafael.maosystems.io        | Demo2026! |

---

## Tenant 2 — Policlínico Vida Plena (mid-tier, no billing)

**Subdomain:** `vidaplena` | **Plan:** Profesional | **MRR:** S/ 999  
**Features:** ✅ WhatsApp · ✅ HCE · ❌ Billing · ✅ Dashboard KPIs · ✅ Custom theme  
**Theme:** Dental (cyan #0088CC / orange #FF6B35)  
**Data:** 15 patients · 18 appointments · 5 consultations · 0 invoices · 2 doctors

| Role     | Email                                     | Password  |
|----------|-------------------------------------------|-----------|
| Admin    | admin@vidaplena.maosystems.io             | Demo2026! |
| Doctor 1 | doctor@vidaplena.maosystems.io            | Demo2026! |
| Doctor 2 | doctor2@vidaplena.maosystems.io           | Demo2026! |

---

## Tenant 3 — Consultorio Dr. Mendoza (starter, all modules OFF)

**Subdomain:** `drmendoza` | **Plan:** Starter | **MRR:** S/ 599  
**Features:** ❌ WhatsApp · ❌ HCE · ❌ Billing · ❌ Dashboard KPIs · ❌ Custom theme  
**Theme:** System default (neutral gray-blue — demonstrates no custom_theme)  
**Data:** 8 patients · 10 appointments · 3 consultations · 0 invoices · 1 doctor (admin IS doctor)

| Role          | Email                                     | Password  |
|---------------|-------------------------------------------|-----------|
| Admin/Doctor  | admin@drmendoza.maosystems.io             | Demo2026! |

---

## Tenant 4 — Centro Médico Bienestar (professional, no billing)

**Subdomain:** `bienestar` | **Plan:** Profesional | **MRR:** S/ 999  
**Features:** ✅ WhatsApp · ✅ HCE · ❌ Billing · ✅ Dashboard KPIs · ✅ Custom theme  
**Theme:** Pediatrics (orange #F5A623 / teal #3DB8A0)  
**Data:** 22 patients · 25 appointments · 7 consultations · 0 invoices · 3 doctors

| Role          | Email                                      | Password  |
|---------------|--------------------------------------------|-----------|
| Admin         | admin@bienestar.maosystems.io              | Demo2026! |
| Doctor 1      | doctor1@bienestar.maosystems.io            | Demo2026! |
| Doctor 2      | doctor2@bienestar.maosystems.io            | Demo2026! |
| Doctor 3      | doctor3@bienestar.maosystems.io            | Demo2026! |
| Recepcionista | recepcion@bienestar.maosystems.io          | Demo2026! |

---

## Tenant 5 — Clínica Santa Lucía (full plan, smaller scale)

**Subdomain:** `santalucia` | **Plan:** Clínica | **MRR:** S/ 1,799  
**Features:** ✅ WhatsApp · ✅ HCE · ✅ Billing · ✅ Dashboard KPIs · ✅ Custom theme  
**Theme:** Gynecology (purple #9B4D96 / pink #E8729A)  
**Data:** 12 patients · 14 appointments · 4 consultations · 3 invoices · 2 doctors

| Role     | Email                                      | Password  |
|----------|--------------------------------------------|-----------|
| Admin    | admin@santalucia.maosystems.io             | Demo2026! |
| Doctor 1 | doctor1@santalucia.maosystems.io           | Demo2026! |
| Doctor 2 | doctor2@santalucia.maosystems.io           | Demo2026! |

---

## Quick setup commands

```bash
# 1. Start DB (Docker)
pnpm db:up

# 2. Run migrations
pnpm db:migrate

# 3. Seed main demo tenant (Clínica San Rafael)
pnpm db:seed

# 4. Seed platform superadmin (run once, never reset)
pnpm seed:platform

# 5. Seed all 4 additional demo tenants
pnpm seed:demo-tenants

# 6. Reset only Tenant 1 (leaves other tenants and PlatformAdmin intact)
pnpm demo:reset
```

---

## Notes

- `reset-demo.ts` / `pnpm demo:reset` only affects **Clínica San Rafael** (tenant 1). It does NOT touch tenants 2–5 or the PlatformAdmin table.
- `seed:platform` is idempotent — safe to run multiple times.
- `seed:demo-tenants` is idempotent — uses upserts, safe to run again.
- Platform panel URL: http://localhost:5173/platform/login
- The platformAccessToken cookie is separate from the tenant accessToken cookie — they cannot be cross-used.

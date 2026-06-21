# MAO Clinics — Demo Credentials

Quick reference for all logins. **Password for all tenant users: `Demo2026!`**

---

## ⭐ TENANT PRINCIPAL DE DEMO — Clínica San Rafael

> Usa este tenant para todas las demos. Tiene todos los módulos activos.

**Plan:** Clínica · **MRR:** S/350 · **URL:** https://demo.maosystems.io/login  
**Módulos:** ✅ WhatsApp · ✅ HCE · ✅ Billing · ✅ Dashboard KPIs · ✅ Tema personalizado  
**Datos:** 50 pacientes · 60 citas · ~16 consultas · ~6 facturas · 3 médicos

| Rol           | Email                              | Contraseña |
|---------------|------------------------------------|------------|
| Admin         | admin@sanrafael.maosystems.io      | Demo2026!  |
| Doctor 1      | dr.garcia@sanrafael.maosystems.io  | Demo2026!  |
| Doctor 2      | dr.mendoza@sanrafael.maosystems.io | Demo2026!  |
| Doctor 3      | dr.quispe@sanrafael.maosystems.io  | Demo2026!  |
| Recepcionista | recepcion@sanrafael.maosystems.io  | Demo2026!  |

**Reset después de cada demo:**
```bash
ssh -i ~/.ssh/mao-ec2.pem ubuntu@<EC2_IP>
cd /srv/mao-clinics
pnpm demo:reset
```

---

## SuperAdmin (Panel de plataforma)

| Rol        | Email                    | Contraseña      | URL                                              |
|------------|--------------------------|-----------------|--------------------------------------------------|
| SuperAdmin | superadmin@maosystems.io | SuperAdmin2026! | https://demo.maosystems.io/platform/login        |

---

## Tenants de referencia (comparativa de planes)

Útiles si quieres mostrar cómo se ve el sistema con distintos niveles de acceso.
No están incluidos en el demo estándar.

### Tenant 2 — Policlínico Vida Plena

**Plan:** Profesional · **MRR:** S/230  
**Módulos:** ✅ WhatsApp · ✅ HCE · ❌ Billing · ✅ Dashboard KPIs · ✅ Tema personalizado  
**Tema:** Dental (cian #0088CC / naranja #FF6B35)  
**Datos:** 15 pacientes · 18 citas · 5 consultas · 2 médicos

| Rol      | Email                         | Contraseña |
|----------|-------------------------------|------------|
| Admin    | admin@vidaplena.maosystems.io | Demo2026!  |
| Doctor 1 | doctor@vidaplena.maosystems.io | Demo2026! |
| Doctor 2 | doctor2@vidaplena.maosystems.io | Demo2026! |

---

### Tenant 3 — Consultorio Dr. Mendoza

**Plan:** Starter · **MRR:** S/100  
**Módulos:** ❌ WhatsApp · ❌ HCE · ❌ Billing · ❌ Dashboard KPIs · ❌ Tema personalizado  
**Nota:** Muestra cómo se ve el plan más básico — sin módulos adicionales, tema por defecto

| Rol          | Email                          | Contraseña |
|--------------|--------------------------------|------------|
| Admin/Doctor | admin@drmendoza.maosystems.io  | Demo2026!  |

---

### Tenant 4 — Centro Médico Bienestar

**Plan:** Profesional · **MRR:** S/230  
**Módulos:** ✅ WhatsApp · ✅ HCE · ❌ Billing · ✅ Dashboard KPIs · ✅ Tema personalizado  
**Tema:** Pediatría (naranja #F5A623 / teal #3DB8A0)  
**Datos:** 22 pacientes · 25 citas · 7 consultas · 3 médicos

| Rol           | Email                           | Contraseña |
|---------------|---------------------------------|------------|
| Admin         | admin@bienestar.maosystems.io   | Demo2026!  |
| Doctor 1      | doctor1@bienestar.maosystems.io | Demo2026!  |
| Doctor 2      | doctor2@bienestar.maosystems.io | Demo2026!  |
| Doctor 3      | doctor3@bienestar.maosystems.io | Demo2026!  |
| Recepcionista | recepcion@bienestar.maosystems.io | Demo2026! |

---

### Tenant 5 — Clínica Santa Lucía

**Plan:** Clínica · **MRR:** S/350  
**Módulos:** ✅ WhatsApp · ✅ HCE · ✅ Billing · ✅ Dashboard KPIs · ✅ Tema personalizado  
**Tema:** Ginecología (morado #9B4D96 / rosa #E8729A)  
**Datos:** 12 pacientes · 14 citas · 4 consultas · 3 facturas · 2 médicos

| Rol      | Email                            | Contraseña |
|----------|----------------------------------|------------|
| Admin    | admin@santalucia.maosystems.io   | Demo2026!  |
| Doctor 1 | doctor1@santalucia.maosystems.io | Demo2026!  |
| Doctor 2 | doctor2@santalucia.maosystems.io | Demo2026!  |

---

## Resumen de planes y precios actuales

| Tenant              | Plan        | MRR    | WhatsApp | HCE | Billing | Dashboard | Tema |
|---------------------|-------------|--------|----------|-----|---------|-----------|------|
| ⭐ Clínica San Rafael | Clínica    | S/350  | ✅       | ✅  | ✅      | ✅        | ✅   |
| Policlínico Vida Plena | Profesional | S/230 | ✅      | ✅  | ❌      | ✅        | ✅   |
| Consultorio Dr. Mendoza | Starter  | S/100  | ❌       | ❌  | ❌      | ❌        | ❌   |
| Centro Médico Bienestar | Profesional | S/230 | ✅     | ✅  | ❌      | ✅        | ✅   |
| Clínica Santa Lucía | Clínica     | S/350  | ✅       | ✅  | ✅      | ✅        | ✅   |

**Planes disponibles (referencia):**

| Plan        | Precio mensual | Médicos incluidos |
|-------------|---------------|-------------------|
| Starter     | S/100         | 1                 |
| Esencial    | S/150         | 5                 |
| Profesional | S/230         | 10                |
| Clínica     | S/350         | Ilimitados        |

Médico adicional: **S/40/mes** · Descuento anual: **15%**

---

## Comandos de setup

```bash
# Seed del tenant principal (Clínica San Rafael)
pnpm db:seed

# Seed del superadmin de plataforma (ejecutar una sola vez)
pnpm seed:platform

# Seed de los 4 tenants adicionales (idempotente)
pnpm seed:demo-tenants

# Reset solo de Clínica San Rafael (no toca los demás tenants ni el SuperAdmin)
pnpm demo:reset

# Recrear todo desde cero ⚠️ DESTRUCTIVO
pnpm db:reset && pnpm db:seed && pnpm seed:platform && pnpm seed:demo-tenants
```

---

## Notas

- `pnpm demo:reset` solo afecta a **Clínica San Rafael** (tenant 1). Los tenants 2–5 y el PlatformAdmin no se tocan.
- `seed:platform` y `seed:demo-tenants` son idempotentes — seguros de ejecutar más de una vez.
- El cookie `platformAccessToken` es independiente del cookie `accessToken` de tenant — no son intercambiables.
- En producción el reset se ejecuta vía SSH al EC2 (`/srv/mao-clinics`).

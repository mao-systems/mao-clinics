# Guía de presentación de demo — MAO Clinics

> Documento interno de MAO Systems.  
> Demo genérica de 15–20 min. Sin investigación previa del cliente.

---

## Índice

1. [Antes de la demo](#1-antes-de-la-demo)
2. [Formato y timing](#2-formato-y-timing)
3. [Intro verbal](#3-intro-verbal)
4. [Live demo — módulos](#4-live-demo--módulos)
5. [Precios](#5-precios)
6. [Q&A y discovery](#6-qa-y-discovery)
7. [Después de la reunión](#7-después-de-la-reunión)
8. [Preguntas frecuentes del cliente](#8-preguntas-frecuentes-del-cliente)
9. [Fundamento de precios por módulo](#9-fundamento-de-precios-por-módulo)
10. [Checklist rápido](#10-checklist-rápido)

---

## 1. Antes de la demo

### 1.1 Entorno (ya está en la nube — no levantas nada local)

| Capa     | Servicio | URL                        |
|----------|----------|----------------------------|
| Frontend | Vercel   | https://demo.maosystems.io |
| Backend  | AWS EC2  | API interna                |

#### Reset de datos antes de cada sesión

```bash
ssh -i ~/.ssh/mao-ec2.pem ubuntu@<EC2_IP>
cd /srv/mao-clinics
pnpm demo:reset
```

### 1.2 Credenciales de demo

| Rol            | Email                    | Contraseña      |
|----------------|--------------------------|-----------------|
| Admin completo | admin@sanrafael.com      | Demo2026!       |
| SuperAdmin     | superadmin@maosystems.io | SuperAdmin2026! |

### 1.3 Setup técnico (30 min antes)

- [ ] Reset ejecutado (SSH → `pnpm demo:reset`)
- [ ] Login verificado en https://demo.maosystems.io/login
- [ ] Tabs pre-abiertas en este orden: login · dashboard · agenda · consulta · /precios
- [ ] Modo No molestar activado
- [ ] Cámara, micrófono y pantalla compartida testeados
- [ ] Hotspot de respaldo listo

---

## 2. Formato y timing

### Por qué no hay deck de slides

Con 15–20 min, cada minuto en slides es un módulo del sistema que no muestras.
El producto es el argumento — verlo funcionar en vivo convence más que cualquier slide.

La intro se hace en **60 segundos verbales** mientras el login carga.  
La página `/precios` hace el trabajo de cierre — es más interactiva que cualquier slide de precios.

```
┌─────────────────────────────────────────────────────────┐
│  Intro verbal                      ~1 min               │
├─────────────────────────────────────────────────────────┤
│  Live demo (4 módulos en sprint)   ~10-12 min           │
├─────────────────────────────────────────────────────────┤
│  Precios — /precios                ~2-3 min             │
├─────────────────────────────────────────────────────────┤
│  Q&A y discovery del cliente       ~4-5 min             │
└─────────────────────────────────────────────────────────┘
                                  Total: 17–21 min
```

### Si el cliente quiere slides

Si en algún momento un cliente te los pide, crea un deck mínimo en **Gamma.app**
(2 slides: problema → solución) y úsalo solo como apertura de 2 min.
No lo uses por defecto.

### Módulos que sí muestras vs los que mencionas de pasada

| Módulo | En esta demo |
|---|---|
| Login + branding | ✅ Muestra (30 seg — primer wow) |
| Dashboard KPIs | ✅ Muestra (30 seg — vista rápida) |
| Agenda de citas | ✅ Muestra (2–3 min — núcleo del producto) |
| Historia Clínica | ✅ Muestra (2–3 min — diferenciador clave) |
| Facturación | Menciona verbalmente al pasar por billing |
| Recordatorio WhatsApp | Menciona al mostrar el badge en agenda |
| Panel admin / tema | ✅ Muestra si sobra 1 min — cambiar un color es muy visual |
| SuperAdmin platform | ❌ No mostrar — no es relevante para el cliente |

---

## 3. Intro verbal

> Duración: **60 segundos** · Mientras compartes pantalla con el login abierto

No leas un guión — di algo así con tus palabras:

> *"MAO Clinics es un sistema de gestión para clínicas y consultorios médicos en Lima.
> Agenda de citas, historia clínica electrónica, recordatorios por WhatsApp, facturación
> a SUNAT y dashboard de métricas — todo en un solo sistema. Te lo muestro funcionando
> en vivo, así ves exactamente cómo quedaría para tu clínica."*

Luego logueas y arranca el demo. Sin más preámbulo.

---

## 4. Live demo — módulos

> Duración total: **10–12 minutos**  
> Ve rápido — el cliente puede pedir ver algo de nuevo en el Q&A.

---

### 4.1 Login + branding (30 seg)

- Ingresa con `admin@sanrafael.com` / `Demo2026!`
- Señala que el sistema carga el logo y los colores de la clínica automáticamente

**Frase:**
> *"Cada clínica entra con su propia identidad visual. Tus médicos y pacientes ven tu marca, no la nuestra."*

---

### 4.2 Dashboard (30–60 seg)

Ruta: `/dashboard`

- Muestra los KPIs del día (citas, pacientes nuevos, ingresos)
- Señala el gráfico de barras semanal

**Frase:**
> *"Este es el primer vistazo del director cada mañana. En 10 segundos sabe cómo va el día."*

No te detengas mucho — sigue avanzando.

---

### 4.3 Agenda de citas (2–3 min)

Ruta: `/appointments`

1. Muestra el calendario semanal
2. Crea una cita nueva en vivo (clic en un slot libre, completa los datos)
3. Cambia el estado: `pendiente → confirmada`
4. Señala el badge de WhatsApp en una cita pasada

**Frases:**
> *"El médico y la recepcionista ven el mismo calendario en tiempo real. Se acabaron las citas dobles."*

> *"Este badge significa que el sistema ya le mandó un WhatsApp automático al paciente 24 horas antes. Sin que nadie llame."*

---

### 4.4 Historia Clínica Electrónica (2–3 min)

Ruta: `/appointments/:id/consultation` (abre una cita existente)

1. Escribe 2–3 líneas en el editor de notas
2. Busca un diagnóstico ICD-10: escribe "diabetes" — muestra el autocomplete
3. Agrega una prescripción rápida
4. Descarga el PDF

**Frase:**
> *"El doctor documenta la consulta en 2 minutos. Todo queda registrado y accesible desde cualquier dispositivo, para siempre."*

---

### 4.5 Panel admin — cambio de tema (1 min, si hay tiempo)

Ruta: `/admin` → Configuración → Apariencia

- Cambia un color del tema en vivo y que lo vean cambiar al instante
- Muestra que se puede subir el logo

**Frase:**
> *"El administrador personaliza el sistema sin llamarnos a nosotros. Colores, logo, usuarios — todo en el panel."*

> ⏱ **Si vas justo de tiempo, sáltate este módulo y menciona que existe.**

---

## 5. Precios

> Duración: **2–3 minutos** · Navega a `https://demo.maosystems.io/precios`

No necesitas slides de precios — esta página ya es tu cierre visual.
Es interactiva: el cliente puede verla después por su cuenta.

**Qué mostrar:**

1. Los 4 planes — destaca el **Profesional** (marcado como "Más popular")
2. Activa el toggle **Anual** para mostrar el 15% de descuento
3. Si pregunta por módulos específicos → baja a "Arma tu propio plan" y actívalos en vivo

**Referencia rápida de planes:**

| Situación del cliente | Recomendación | Precio |
|---|---|---|
| 1 médico, solo agenda | Starter | S/100/mes |
| Quiere HCE + WhatsApp | Esencial | S/150/mes |
| Todo incluido, varios médicos | Profesional | S/230/mes + S/40/médico extra |
| 14+ médicos | Clínica | S/350/mes (ilimitados) |

> **Tip de upsell:** Si piden Profesional + 5 médicos extra = S/430. Ofrece Clínica a S/350 antes de que hagan el cálculo — se ahorran S/80 y ves que estás de su lado.

**Frase de cierre:**
> *"¿Le gustaría que activemos la clínica esta semana? Podemos tenerlos funcionando en menos de 24 horas."*

---

## 6. Q&A y discovery

> Duración: **4–5 minutos**  
> Deja que el cliente hable. No vuelvas a vender — orienta.

**Preguntas para abrir:**
- *"¿Qué parte les pareció más útil para lo que hacen hoy?"*
- *"¿Cuántos médicos tienen en la clínica?"*
- *"¿Cómo gestionan hoy sus citas y sus historiales?"*

**Señales de compra y respuesta:**

| Si dicen... | Tu respuesta |
|---|---|
| "Se nos van pacientes sin avisar" | WhatsApp está en Esencial desde S/150 |
| "Los expedientes están en papel" | HCE está en Esencial — solo S/60 a-la-carte |
| "SUNAT nos está exigiendo factura electrónica" | Billing disponible en Profesional o a-la-carte S/60 |
| "Somos varios doctores" | Calcula con ellos en /precios → calculadora |
| "¿Pueden migrar nuestros datos?" | Sí, ofrecemos migración desde Excel/CSV — lo evaluamos según volumen |

**Si necesitan pensarlo:**
- Envía `https://demo.maosystems.io/precios` por WhatsApp antes de colgar
- Define fecha concreta: *"¿Te parece si hablo contigo el jueves?"*
- No presiones, pero no cierres sin una próxima acción definida

---

## 7. Después de la reunión

### Inmediatamente (< 1 hora)

```bash
# Reset para la próxima demo
ssh -i ~/.ssh/mao-ec2.pem ubuntu@<EC2_IP>
cd /srv/mao-clinics
pnpm demo:reset
```

Envía por WhatsApp o correo:
- https://demo.maosystems.io/precios
- Propuesta en PDF si la pidieron

### Follow-up a los 3 días (si no hay respuesta)

> *"Hola [nombre], espero que esté bien. ¿Tuvo oportunidad de revisar la propuesta? ¿Tiene alguna pregunta que pueda responder?"*

### Registro interno

Anota en CRM o Notion: fecha · especialidad · nº médicos · módulos de interés · plan recomendado · objeción principal · fecha de follow-up.

---

## 8. Preguntas frecuentes del cliente

| Pregunta | Respuesta |
|---|---|
| "¿Y si se cae el internet?" | "El sistema requiere conexión. Para la mayoría de clínicas el internet es suficientemente estable." |
| "¿Mis datos son privados?" | "Absolutamente aislados. Cifrado en tránsito y reposo. Ley 29733 cumplida." |
| "¿Dónde están mis datos?" | "Servidores AWS — misma infraestructura que Netflix, Airbnb, el 90% del SaaS global. Backups diarios automáticos." |
| "¿Pueden migrar mis datos?" | "Sí, desde Excel o CSV. Lo evaluamos según el volumen." |
| "¿Puedo cancelar cuando quiera?" | "Sí, sin penalidades. El plan mensual se cancela antes del siguiente ciclo." |
| "¿Tienen app móvil?" | "100% responsive — funciona desde el celular sin instalar nada. App nativa está en la hoja de ruta." |
| "¿Puedo probar antes de pagar?" | "Sí, 15 días de prueba gratuita con todos los módulos activos." |

---

## 9. Fundamento de precios por módulo

> Usa esto si el cliente pregunta "¿por qué cuesta eso?".  
> Si dice "está caro", primero pregunta: *"¿Caro comparado con qué?"*  
> Hacer el cálculo con sus propios números vale más que cualquier descuento.

| Módulo | Precio | Argumento central |
|---|---|---|
| Base | S/100 | Una clínica pierde 2–3 citas/semana por errores de agenda (S/500–1,000/mes). El sistema se paga solo. |
| HCE | S/60 | 30–50 min liberados por día (5–8 min → 2–3 min por paciente). Expedientes físicos cuestan S/80–150/mes solo en insumos. |
| WhatsApp | S/50 | No-shows bajan del 20–30% al 5–10%. Ejemplo: 80 citas/mes a S/70 = S/980 recuperados. El módulo cuesta S/50. |
| Dashboard | S/35 | Un contador que hace estos reportes manualmente cobra S/500–1,200/mes. El dashboard lo automatiza. |
| Facturación | S/60 | Multas SUNAT por no emitir comprobante electrónico: S/180–7,245. El módulo garantiza cumplimiento automático. |
| Tema | S/25 | Adaptar una herramienta a tu marca con un diseñador: S/300–800 por proyecto. Aquí es permanente. |
| Médico extra | S/40 | Un médico genera S/3,000–8,000/mes. S/40 = 0.5–1.3% de su producción. Prácticamente irrelevante. |

---

## 10. Checklist rápido

### Antes ✅

- [ ] Reset: SSH → `pnpm demo:reset`
- [ ] Login verificado: https://demo.maosystems.io/login
- [ ] Tabs abiertas en orden: login · dashboard · agenda · consulta · /precios
- [ ] Modo No molestar ON
- [ ] Cámara + micrófono + pantalla compartida OK
- [ ] Hotspot de respaldo listo

### Durante ✅

- [ ] Intro verbal — 60 seg mientras carga el login
- [ ] Login + branding — 30 seg
- [ ] Dashboard — 30–60 seg
- [ ] Agenda (crear cita, badge WhatsApp) — 2–3 min
- [ ] HCE (nota, ICD-10, PDF) — 2–3 min
- [ ] Admin/tema — 1 min si hay tiempo, si no: mencionar
- [ ] /precios — 2–3 min, toggle anual, calculadora si pide
- [ ] Q&A — escuchar, orientar, definir próximo paso

### Después ✅

- [ ] Reset: SSH → `pnpm demo:reset`
- [ ] Enviar https://demo.maosystems.io/precios
- [ ] CRM actualizado
- [ ] Follow-up agendado

---

*MAO Systems · Lima, Perú · ventas@maosystems.io*

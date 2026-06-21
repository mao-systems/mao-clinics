import { useState } from 'react'
import { Check, X, Plus, Minus, MessageCircle, Mail, ChevronDown, ChevronUp, Stethoscope, Tag, Star } from 'lucide-react'

// ─── Pricing constants (mirrors apps/backend/src/config/pricing.ts) ──────────

const MODULE_PRICES = {
  base:               100,  // agenda + gestión de pacientes + 1 médico incluido · IGV incluido
  whatsapp_reminders:  50,
  hce:                60,
  billing:            60,
  dashboard_kpis:     35,
  custom_theme:       25,
  extra_doctor:       40,   // por cada médico adicional al cupo del plan · IGV incluido
}

const ANNUAL_DISCOUNT = 0.15  // 15% off al pagar anualmente

function getAnnualMonthlyEquivalent(monthlyPrice: number): number {
  return Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT) / 5) * 5
}

function getAnnualTotal(monthlyPrice: number): number {
  return getAnnualMonthlyEquivalent(monthlyPrice) * 12
}

function annualSavings(monthlyPrice: number): number {
  return monthlyPrice * 12 - getAnnualTotal(monthlyPrice)
}

// ─── Plan definitions ─────────────────────────────────────────────────────────

type Billing = 'monthly' | 'annual'

interface PlanDef {
  id: string
  name: string
  tagline: string
  monthlyPrice: number
  includedDoctors: number | null   // null = ilimitados
  highlight: boolean
  badge?: string
  features: { label: string; included: boolean }[]
  extras?: string[]  // beneficios extra que no son módulos de sistema
}

const PLANS: PlanDef[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Un consultorio, lo esencial para arrancar.',
    monthlyPrice: 100,
    includedDoctors: 1,
    highlight: false,
    features: [
      { label: 'Agenda de citas',              included: true  },
      { label: 'Gestión de pacientes',         included: true  },
      { label: 'Panel de administración',      included: true  },
      { label: 'Soporte técnico incluido',     included: true  },
      { label: 'Historia Clínica Electrónica', included: false },
      { label: 'Recordatorios WhatsApp',       included: false },
      { label: 'Dashboard KPIs',               included: false },
      { label: 'Facturación electrónica',      included: false },
      { label: 'Tema / logo personalizado',    included: false },
    ],
  },
  {
    id: 'esencial',
    name: 'Esencial',
    tagline: 'Historia clínica y recordatorios sin complicaciones.',
    monthlyPrice: 150,
    includedDoctors: 5,
    highlight: false,
    features: [
      { label: 'Agenda de citas',              included: true  },
      { label: 'Gestión de pacientes',         included: true  },
      { label: 'Panel de administración',      included: true  },
      { label: 'Soporte técnico incluido',     included: true  },
      { label: 'Historia Clínica Electrónica', included: true  },
      { label: 'Recordatorios WhatsApp',       included: true  },
      { label: 'Dashboard KPIs',               included: false },
      { label: 'Facturación electrónica',      included: false },
      { label: 'Tema / logo personalizado',    included: false },
    ],
  },
  {
    id: 'profesional',
    name: 'Profesional',
    tagline: 'Todo incluido para clínicas en crecimiento.',
    monthlyPrice: 230,
    includedDoctors: 10,
    highlight: true,
    badge: 'Más popular',
    features: [
      { label: 'Agenda de citas',              included: true },
      { label: 'Gestión de pacientes',         included: true },
      { label: 'Panel de administración',      included: true },
      { label: 'Soporte técnico incluido',     included: true },
      { label: 'Historia Clínica Electrónica', included: true },
      { label: 'Recordatorios WhatsApp',       included: true },
      { label: 'Dashboard KPIs',               included: true },
      { label: 'Facturación electrónica',      included: true },
      { label: 'Tema / logo personalizado',    included: true },
    ],
  },
  {
    id: 'clinica',
    name: 'Clínica',
    tagline: 'Médicos ilimitados + atención dedicada de MAO.',
    monthlyPrice: 350,
    includedDoctors: null,
    highlight: false,
    features: [
      { label: 'Agenda de citas',              included: true },
      { label: 'Gestión de pacientes',         included: true },
      { label: 'Panel de administración',      included: true },
      { label: 'Soporte técnico incluido',     included: true },
      { label: 'Historia Clínica Electrónica', included: true },
      { label: 'Recordatorios WhatsApp',       included: true },
      { label: 'Dashboard KPIs',               included: true },
      { label: 'Facturación electrónica',      included: true },
      { label: 'Tema / logo personalizado',    included: true },
    ],
    extras: [
      'Capacitación presencial de onboarding',
      'Canal de WhatsApp dedicado a tu clínica',
    ],
  },
]

// ─── Custom plan modules ──────────────────────────────────────────────────────

interface Module {
  id: keyof typeof MODULE_PRICES
  label: string
  description: string
  category: 'base' | 'premium'
}

const MODULES: Module[] = [
  { id: 'hce',               label: 'Historia Clínica Electrónica', description: 'Notas de consulta, prescripciones y adjuntos en PDF.',   category: 'base'    },
  { id: 'whatsapp_reminders', label: 'Recordatorios WhatsApp',       description: 'Notificación automática 24 h antes de cada cita.',       category: 'base'    },
  { id: 'dashboard_kpis',    label: 'Dashboard KPIs',                description: 'Métricas de ingresos, citas y pacientes en tiempo real.', category: 'base'    },
  { id: 'billing',           label: 'Facturación electrónica',       description: 'Boletas y facturas SUNAT vía Nubefact.',                 category: 'base'    },
  { id: 'custom_theme',      label: 'Tema y logo personalizado',     description: 'Colores de marca, logo propio y paleta a medida.',       category: 'base'    },
]

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: '¿Hay contrato de permanencia?',
    a: 'No. Los planes mensuales se cancelan en cualquier momento sin penalidad. El plan anual no tiene reembolso por meses no usados, pero tampoco hay permanencia forzada.',
  },
  {
    q: '¿Cómo funciona el descuento anual?',
    a: 'Al elegir facturación anual obtienes un 15% de descuento sobre el precio mensual, cobrado en un solo pago al inicio. Por ejemplo, el plan Profesional pasa de S/550 a S/468/mes equivalente (S/5,610 al año).',
  },
  {
    q: '¿Puedo cambiar de plan después?',
    a: 'Sí, en cualquier momento. El cambio aplica en el siguiente ciclo de facturación. Si escalas de Esencial a Profesional, solo pagas la diferencia.',
  },
  {
    q: '¿Los datos de mi clínica están aislados?',
    a: 'Completamente. Cada clínica opera en su propio espacio aislado (tenant_id). Ningún otro cliente puede ver tus datos. Cumplimos con la Ley 29733 de protección de datos personales.',
  },
  {
    q: '¿Qué incluye el soporte técnico?',
    a: 'Todos los planes incluyen soporte técnico sin distinción. El plan Clínica agrega beneficios adicionales como capacitación presencial y un canal de WhatsApp dedicado exclusivo para tu clínica.',
  },
  {
    q: '¿Para quién es el plan Personalizado?',
    a: 'Para cualquier clínica que quiera elegir exactamente qué módulos activar y cuántos médicos registrar. La base incluye 1 médico y puedes sumar más a S/30/mes c/u. Si un plan fijo resulta más barato para tu combinación, la calculadora te lo avisa automáticamente.',
  },
  {
    q: '¿El plan Personalizado tiene descuento anual?',
    a: 'Sí. Al cambiar el toggle a "Anual" en la calculadora verás el equivalente mensual con el 15% aplicado sobre tu selección de módulos.',
  },
  {
    q: '¿Qué pasa con mis datos si cancelo?',
    a: 'Tienes 30 días calendario para exportar todo en CSV o PDF. Pasado ese plazo, los datos se eliminan de forma permanente e irreversible.',
  },
  {
    q: '¿Tienen aplicación móvil?',
    a: 'El sistema es 100% responsive; funciona desde el celular sin instalar nada. Una app nativa para iOS y Android está en la hoja de ruta.',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Cheapest bundle that covers a given doctor count + module set ────────────
// Returns null if custom is already cheaper than all covering bundles.

function cheaperBundle(doctors: number, modules: Set<string>): { name: string; price: number } | null {
  // Esencial covers: hce + whatsapp_reminders, up to 5 doctors (extendable via extra_doctor)
  const esencialCovers = ['hce', 'whatsapp_reminders']
  const esencialBasePrice = 150
  const esencialMaxBase   = 5

  // Profesional covers all modules, up to 10 doctors
  const profesionalCovers = ['hce', 'whatsapp_reminders', 'billing', 'dashboard_kpis', 'custom_theme']
  const profesionalBasePrice = 230
  const profesionalMaxBase   = 10

  // Clínica covers all modules, unlimited doctors
  const clinicaBasePrice = 350

  const selectedArr = Array.from(modules)

  // Helper: extra doctor cost on top of a base plan
  const extraCost = (included: number) =>
    Math.max(0, doctors - included) * MODULE_PRICES.extra_doctor

  // Check if a bundle covers all selected modules
  const coveredByEsencial    = selectedArr.every(m => esencialCovers.includes(m))
  const coveredByProfesional = selectedArr.every(m => profesionalCovers.includes(m))

  const candidates: { name: string; price: number }[] = []

  if (doctors <= 10 && coveredByEsencial) {
    candidates.push({
      name: `Esencial${doctors > esencialMaxBase ? ` + ${doctors - esencialMaxBase} médico${doctors - esencialMaxBase > 1 ? 's' : ''} extra` : ''}`,
      price: esencialBasePrice + extraCost(esencialMaxBase),
    })
  }
  if (doctors <= 10 && coveredByProfesional) {
    candidates.push({
      name: `Profesional${doctors > profesionalMaxBase ? ` + ${doctors - profesionalMaxBase} médico${doctors - profesionalMaxBase > 1 ? 's' : ''} extra` : ''}`,
      price: profesionalBasePrice + extraCost(profesionalMaxBase),
    })
  }
  // Clínica always available for any doctor count
  if (coveredByProfesional) {
    candidates.push({ name: 'Clínica', price: clinicaBasePrice })
  }

  // Pick the cheapest bundle that actually covers the selection
  if (candidates.length === 0) return null
  return candidates.reduce((best, c) => c.price < best.price ? c : best)
}

export default function PricingPage() {
  const [billing, setBilling]                   = useState<Billing>('monthly')
  const [selectedModules, setSelectedModules]   = useState<Set<string>>(new Set())
  const [extraDoctors, setExtraDoctors]         = useState(0)
  const [openFaq, setOpenFaq]                   = useState<number | null>(null)

  const totalDoctors = 1 + extraDoctors  // base always includes 1

  const toggleModule = (id: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const customMonthly =
    MODULE_PRICES.base +
    extraDoctors * MODULE_PRICES.extra_doctor +
    MODULES.filter(m => selectedModules.has(m.id))
           .reduce((s, m) => s + MODULE_PRICES[m.id], 0)

  const customDisplay = billing === 'annual'
    ? getAnnualMonthlyEquivalent(customMonthly)
    : customMonthly

  // Smart upgrade hint: find cheapest bundle that covers this exact combo
  const betterBundle = cheaperBundle(totalDoctors, selectedModules)

  const whatsappLink = `https://wa.me/51999999999?text=${encodeURIComponent('Hola, me interesa conocer más sobre los planes de MAO Clinics.')}`

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1a5f9e' }}>
              <Stethoscope size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">
              MAO <span style={{ color: '#1a5f9e' }}>Clinics</span>
            </span>
          </div>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#25d366' }}
          >
            <MessageCircle size={16} />
            Hablar con ventas
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="text-center py-14 px-4 sm:px-6">
        <span
          className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4 border"
          style={{ color: '#1a5f9e', backgroundColor: '#e6f1fb', borderColor: '#bddaf7' }}
        >
          Planes y precios
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          Elige el plan que le va<br />
          <span style={{ color: '#1a5f9e' }}>a tu clínica</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-2">
          Sin contratos. Sin sorpresas. Pagas solo por lo que usas.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Todos los precios en <strong>soles peruanos (S/)</strong> · precios finales
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setBilling('monthly')}
            className={[
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              billing === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={[
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              billing === 'annual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Anual
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
            >
              15% off
            </span>
          </button>
        </div>
      </section>

      {/* ── PLAN CARDS ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(plan => {
            const shownPrice  = billing === 'annual'
              ? getAnnualMonthlyEquivalent(plan.monthlyPrice)
              : plan.monthlyPrice
            const savings     = annualSavings(plan.monthlyPrice)
            const annualAmt   = getAnnualTotal(plan.monthlyPrice)
            const doctorsLabel = plan.includedDoctors === null
              ? 'Médicos ilimitados'
              : `${plan.includedDoctors} médico${plan.includedDoctors > 1 ? 's' : ''} incluido${plan.includedDoctors > 1 ? 's' : ''}`

            return (
              <div
                key={plan.id}
                className={[
                  'relative rounded-2xl border p-5 flex flex-col transition-shadow',
                  plan.highlight
                    ? 'shadow-xl border-transparent'
                    : 'bg-white shadow-sm border-gray-200 hover:shadow-md',
                ].join(' ')}
                style={plan.highlight ? { background: '#1a2740' } : {}}
              >
                {plan.badge && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-wider text-white px-3 py-1 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: '#2eaa6e' }}
                  >
                    {plan.badge}
                  </span>
                )}

                {/* Name + tagline */}
                <div className="mb-5">
                  <h2 className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h2>
                  <p className={`text-xs mb-4 leading-relaxed ${plan.highlight ? 'text-blue-200' : 'text-gray-500'}`}>
                    {plan.tagline}
                  </p>

                  {/* Price */}
                  <div className="flex items-end gap-1">
                    <span className={`text-3xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                      S/{shownPrice.toLocaleString('es-PE')}
                    </span>
                    <span className={`text-sm mb-0.5 ${plan.highlight ? 'text-blue-300' : 'text-gray-400'}`}>/mes</span>
                  </div>

                  {/* Annual subtext */}
                  {billing === 'annual' ? (
                    <div className="mt-1.5 space-y-0.5">
                      <p className={`text-xs ${plan.highlight ? 'text-blue-300' : 'text-gray-400'}`}>
                        S/{annualAmt.toLocaleString('es-PE')}/año · cobrado anualmente
                      </p>
                      <p className="text-xs font-semibold" style={{ color: '#2eaa6e' }}>
                        Ahorras S/{savings.toLocaleString('es-PE')}/año
                      </p>
                    </div>
                  ) : (
                    <p className={`text-xs mt-1 ${plan.highlight ? 'text-blue-300' : 'text-gray-400'}`}>
                      o S/{getAnnualMonthlyEquivalent(plan.monthlyPrice).toLocaleString('es-PE')}/mes al pagar anual
                    </p>
                  )}

                  <p className={`text-xs mt-2 font-semibold ${plan.highlight ? 'text-blue-300' : 'text-gray-500'}`}>
                    {doctorsLabel}
                  </p>
                  {plan.includedDoctors !== null && (
                    <p className={`text-xs mt-0.5 ${plan.highlight ? 'text-blue-400' : 'text-gray-400'}`}>
                      + S/{MODULE_PRICES.extra_doctor}/mes por médico adicional
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f.label} className="flex items-start gap-2">
                      {f.included
                        ? <Check size={14} className="mt-0.5 shrink-0" style={{ color: '#2eaa6e' }} />
                        : <X    size={14} className="mt-0.5 shrink-0 text-gray-300" />
                      }
                      <span className={`text-xs ${f.included
                          ? plan.highlight ? 'text-white' : 'text-gray-700'
                          : 'text-gray-400 line-through'}`}>
                        {f.label}
                      </span>
                    </li>
                  ))}

                  {/* Extras for Clínica plan */}
                  {plan.extras && plan.extras.map(e => (
                    <li key={e} className="flex items-start gap-2">
                      <Star size={14} className="mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
                      <span className="text-xs text-amber-300 font-medium">{e}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={plan.highlight
                    ? { backgroundColor: '#2eaa6e', color: '#fff' }
                    : { backgroundColor: '#1a5f9e', color: '#fff' }}
                >
                  Empezar con {plan.name}
                </a>
              </div>
            )
          })}
        </div>

        {/* Annual savings banner */}
        {billing === 'annual' && (
          <div
            className="mt-6 flex items-center justify-center gap-2 text-sm font-medium py-3 px-5 rounded-xl"
            style={{ backgroundColor: '#ecfdf5', color: '#065f46' }}
          >
            <Tag size={15} />
            Con facturación anual ahorras entre{' '}
            <strong>S/{annualSavings(PLANS[0].monthlyPrice).toLocaleString('es-PE')}</strong>
            {' '}y{' '}
            <strong>S/{annualSavings(PLANS[3].monthlyPrice).toLocaleString('es-PE')}</strong>
            {' '}al año
          </div>
        )}
      </section>

      {/* ── CUSTOM PLAN ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Header */}
          <div
            className="px-6 pt-8 pb-6 border-b border-gray-100"
            style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)' }}
          >
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3 border"
              style={{ color: '#1a5f9e', backgroundColor: '#e6f1fb', borderColor: '#bddaf7' }}
            >
              Plan personalizado
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              Arma tu propio plan
            </h2>
            <p className="text-gray-500 text-sm max-w-xl">
              Parte de la base (S/{MODULE_PRICES.base}/mes · 1 médico incluido) y activa solo los módulos
              que necesitas. Agrega médicos a S/{MODULE_PRICES.extra_doctor}/mes c/u. Si un plan fijo
              te resulta más conveniente, la calculadora te lo avisa.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-0">
            {/* Left: toggles */}
            <div className="md:col-span-3 p-6 border-r border-gray-100">

              {/* Base tile */}
              <div
                className="mb-6 p-4 rounded-xl border-2 border-dashed"
                style={{ borderColor: '#1a5f9e', backgroundColor: '#f0f7ff' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Base del sistema</p>
                    <p className="text-xs text-gray-500 mt-0.5">1 médico incluido · Agenda · Pacientes · Panel admin</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: '#1a5f9e' }}>S/{MODULE_PRICES.base}</p>
                    <p className="text-xs text-gray-400">siempre incluido</p>
                  </div>
                </div>
              </div>

              {/* Doctor counter */}
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Médicos</p>
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {totalDoctors} médico{totalDoctors > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      1 incluido en base · +S/{MODULE_PRICES.extra_doctor}/mes c/u adicional
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExtraDoctors(d => Math.max(0, d - 1))}
                      disabled={extraDoctors === 0}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-gray-900">{totalDoctors}</span>
                    <button
                      onClick={() => setExtraDoctors(d => d + 1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
                      style={{ backgroundColor: '#1a5f9e' }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modules */}
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Módulos opcionales</p>
                <div className="space-y-2">
                  {MODULES.map(mod => {
                    const active = selectedModules.has(mod.id)
                    return (
                      <label
                        key={mod.id}
                        className={[
                          'flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all',
                          active
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleModule(mod.id)}
                            className="w-4 h-4 rounded accent-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{mod.label}</p>
                            <p className="text-xs text-gray-500">{mod.description}</p>
                          </div>
                        </div>
                        <span
                          className="text-xs font-semibold ml-4 shrink-0"
                          style={{ color: active ? '#1a5f9e' : '#6b7280' }}
                        >
                          +S/{MODULE_PRICES[mod.id]}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right: summary */}
            <div className="md:col-span-2 p-6 flex flex-col" style={{ backgroundColor: '#f8fafc' }}>

              {/* Mini billing toggle */}
              <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-0.5 mb-5 self-start">
                {(['monthly', 'annual'] as Billing[]).map(b => (
                  <button
                    key={b}
                    onClick={() => setBilling(b)}
                    className={[
                      'px-3 py-1 rounded-md text-xs font-semibold transition-all',
                      billing === b ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500',
                    ].join(' ')}
                  >
                    {b === 'monthly' ? 'Mensual' : 'Anual −15%'}
                  </button>
                ))}
              </div>

              <h3 className="font-bold text-gray-900 mb-4">
                Resumen {billing === 'annual' ? 'anual' : 'mensual'}
              </h3>

              <div className="flex-1 space-y-2 mb-6">
                {/* Line items */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base del sistema</span>
                  <span className="font-medium text-gray-900">S/{MODULE_PRICES.base}</span>
                </div>

                {extraDoctors > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">+{extraDoctors} médico{extraDoctors > 1 ? 's' : ''} adicional{extraDoctors > 1 ? 'es' : ''}</span>
                    <span className="font-medium text-gray-900">S/{extraDoctors * MODULE_PRICES.extra_doctor}</span>
                  </div>
                )}

                {MODULES.filter(m => selectedModules.has(m.id)).map(m => (
                  <div key={m.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate pr-2">{m.label}</span>
                    <span className="font-medium text-gray-900 shrink-0">S/{MODULE_PRICES[m.id]}</span>
                  </div>
                ))}

                {selectedModules.size === 0 && extraDoctors === 0 && (
                  <p className="text-xs text-gray-400 italic pt-1">Ajusta médicos o activa módulos para ver el desglose.</p>
                )}

                {/* Totals */}
                <div className="border-t border-gray-200 pt-3 mt-2 space-y-1">
                  {billing === 'annual' && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Precio mensual base</span>
                      <span>S/{customMonthly}/mes</span>
                    </div>
                  )}
                  {billing === 'annual' && (
                    <div className="flex justify-between text-xs" style={{ color: '#2eaa6e' }}>
                      <span>Descuento anual (−15%)</span>
                      <span>−S/{Math.round(customMonthly * 0.15 * 12).toLocaleString('es-PE')}/año</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end pt-1">
                    <div>
                      <span className="text-sm font-semibold text-gray-700">
                        {billing === 'annual' ? 'Total al año' : 'Total mensual'}
                      </span>
                      {billing === 'annual' && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          ≈ S/{customDisplay.toLocaleString('es-PE')}/mes
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-extrabold" style={{ color: '#1a5f9e' }}>
                        S/{(billing === 'annual'
                          ? getAnnualTotal(customMonthly)
                          : customMonthly
                        ).toLocaleString('es-PE')}
                      </p>
                      <p className="text-xs text-gray-400">precio final</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Smart upgrade hint */}
              {betterBundle && betterBundle.price < customMonthly && (
                <div className="mb-4 p-3 rounded-lg text-xs" style={{ backgroundColor: '#fff7ed', color: '#92400e' }}>
                  💡 El plan <strong>{betterBundle.name}</strong> cubre esta combinación por{' '}
                  <strong>S/{betterBundle.price}/mes</strong>, ahorrándote{' '}
                  <strong>S/{customMonthly - betterBundle.price}/mes</strong>.
                </div>
              )}
              {betterBundle && betterBundle.price === customMonthly && (
                <div className="mb-4 p-3 rounded-lg text-xs" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
                  ✅ El plan <strong>{betterBundle.name}</strong> cubre exactamente esta combinación al mismo precio, con médicos adicionales ya incluidos.
                </div>
              )}

              {/* CTAs */}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 mb-3"
                style={{ backgroundColor: '#25d366' }}
              >
                <MessageCircle size={14} />
                Cotizar por WhatsApp
              </a>
              <a
                href="mailto:ventas@maosystems.io"
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Mail size={14} />
                Enviar por correo
              </a>
              <p className="text-xs text-gray-400 text-center mt-4">
                Sin compromiso · Cancela cuando quieras
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE (compact) ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-8">Comparativa de planes</h2>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-4 text-gray-500 font-semibold w-2/5">Funcionalidad</th>
                {PLANS.map(p => (
                  <th key={p.id} className={`px-4 py-4 text-center font-bold ${p.highlight ? 'text-white rounded-t-xl' : 'text-gray-900'}`}
                      style={p.highlight ? { backgroundColor: '#1a5f9e' } : {}}>
                    {p.name}
                    <p className={`text-xs font-normal mt-0.5 ${p.highlight ? 'text-blue-200' : 'text-gray-400'}`}>
                      S/{billing === 'annual'
                        ? getAnnualMonthlyEquivalent(p.monthlyPrice).toLocaleString('es-PE')
                        : p.monthlyPrice.toLocaleString('es-PE')}/mes
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                'Agenda de citas',
                'Gestión de pacientes',
                'Panel de administración',
                'Historia Clínica Electrónica',
                'Recordatorios WhatsApp',
                'Dashboard KPIs',
                'Facturación electrónica',
                'Tema / logo personalizado',
              ].map((feat, i) => (
                <tr key={feat} className={i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                  <td className="px-5 py-3 text-gray-700">{feat}</td>
                  {PLANS.map(p => {
                    const included = p.features.find(f => f.label === feat)?.included ?? false
                    return (
                      <td key={p.id} className="px-4 py-3 text-center">
                        {included
                          ? <Check size={16} className="mx-auto" style={{ color: '#2eaa6e' }} />
                          : <X    size={16} className="mx-auto text-gray-300" />
                        }
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="border-t border-gray-100">
                <td className="px-5 py-3 text-gray-700">Médicos incluidos</td>
                {PLANS.map(p => (
                  <td key={p.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-600">
                    {p.includedDoctors === null ? '∞' : p.includedDoctors}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50/50">
                <td className="px-5 py-3 text-gray-700">Soporte técnico</td>
                {PLANS.map(p => (
                  <td key={p.id} className="px-4 py-3 text-center">
                    <Check size={16} className="mx-auto" style={{ color: '#2eaa6e' }} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-8">Preguntas frecuentes</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900 text-sm pr-4">{faq.q}</span>
                {openFaq === i
                  ? <ChevronUp   size={16} className="shrink-0 text-gray-400" />
                  : <ChevronDown size={16} className="shrink-0 text-gray-400" />
                }
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-500 border-t border-gray-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section
        className="text-center py-16 px-4"
        style={{ background: 'linear-gradient(135deg, #1a2740 0%, #0c3f6b 100%)' }}
      >
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
          ¿Listo para digitalizar tu clínica?
        </h2>
        <p className="text-blue-200 text-sm mb-8 max-w-md mx-auto">
          Nuestro equipo puede tener tu clínica operativa en menos de 24 horas.
          Empieza hoy mismo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#25d366', color: '#fff' }}
          >
            <MessageCircle size={16} />
            Escríbenos por WhatsApp
          </a>
          <a
            href="mailto:ventas@maosystems.io"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border border-white/30 text-white hover:bg-white/10 transition-colors"
          >
            <Mail size={16} />
            ventas@maosystems.io
          </a>
        </div>
        <p className="text-blue-300 text-xs mt-8 opacity-60">
          © {new Date().getFullYear()} MAO Systems · maosystems.io · Lima, Perú
        </p>
      </section>
    </div>
  )
}

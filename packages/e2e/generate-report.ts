/**
 * Reads test-results/results.json produced by Playwright's JSON reporter
 * and writes a human-readable summary to test-results/summary.md.
 *
 * Run after tests: pnpm --filter @mao-systems/e2e generate-report
 */

import fs from 'fs'
import path from 'path'

interface PlaywrightSuite {
  title: string
  file?: string
  specs: PlaywrightSpec[]
  suites?: PlaywrightSuite[]
}

interface PlaywrightSpec {
  title: string
  ok: boolean
  tests: PlaywrightTest[]
}

interface PlaywrightTest {
  status: 'passed' | 'failed' | 'skipped' | 'timedOut'
  duration: number
  errors?: Array<{ message?: string }>
}

interface PlaywrightResults {
  stats: {
    expected: number
    unexpected: number
    skipped: number
    duration: number
  }
  suites: PlaywrightSuite[]
}

const RESULTS_FILE = path.join(__dirname, 'test-results', 'results.json')
const OUTPUT_FILE  = path.join(__dirname, 'test-results', 'summary.md')
const TEST_URL     = process.env.TEST_URL || 'https://demo.maosystems.io'

function collectSpecs(suite: PlaywrightSuite): PlaywrightSpec[] {
  const specs: PlaywrightSpec[] = [...suite.specs]
  if (suite.suites) {
    for (const sub of suite.suites) {
      specs.push(...collectSpecs(sub))
    }
  }
  return specs
}

function suiteLabel(file: string): string {
  const name = path.basename(file, path.extname(file))
  const map: Record<string, string> = {
    '01-auth':         '01 Autenticación',
    '02-dashboard':    '02 Dashboard',
    '03-patients':     '03 Pacientes',
    '04-appointments': '04 Citas',
    '05-hce':          '05 HCE',
    '06-billing':      '06 Facturación',
    '07-theming':      '07 Theming',
  }
  return map[name] ?? name
}

function main(): void {
  if (!fs.existsSync(RESULTS_FILE)) {
    console.error(`Results file not found: ${RESULTS_FILE}`)
    console.error('Run "pnpm test" first to generate test results.')
    process.exit(1)
  }

  const raw = fs.readFileSync(RESULTS_FILE, 'utf-8')
  const results: PlaywrightResults = JSON.parse(raw)

  const { stats } = results
  const passed  = stats.expected
  const failed  = stats.unexpected
  const skipped = stats.skipped
  const total   = passed + failed + skipped
  const durationSec = (stats.duration / 1000).toFixed(1)

  const now = new Date().toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'full',
    timeStyle: 'short',
  })

  // ── Per-suite stats ──────────────────────────────────────────────────────────
  type SuiteRow = { label: string; passed: number; failed: number; skipped: number; durationMs: number }
  const suiteRows: SuiteRow[] = []
  const failedTests: Array<{ suite: string; title: string; error: string }> = []

  for (const topSuite of results.suites) {
    const file  = topSuite.file ?? topSuite.title
    const label = suiteLabel(file)
    let sp = 0, sf = 0, ss = 0, sdur = 0

    const specs = collectSpecs(topSuite)
    for (const spec of specs) {
      for (const test of spec.tests) {
        sdur += test.duration
        if (test.status === 'passed')  sp++
        else if (test.status === 'skipped') ss++
        else {
          sf++
          const errMsg = test.errors?.[0]?.message?.split('\n')[0] ?? 'Unknown error'
          failedTests.push({ suite: label, title: spec.title, error: errMsg })
        }
      }
    }

    suiteRows.push({ label, passed: sp, failed: sf, skipped: ss, durationMs: sdur })
  }

  // ── Markdown output ──────────────────────────────────────────────────────────
  const lines: string[] = [
    '# MAO Systems E2E Test Report',
    '',
    `**Fecha:** ${now}`,
    `**Entorno:** ${TEST_URL}`,
    `**Navegador:** Chromium`,
    `**Duración total:** ${durationSec}s`,
    '',
    '## Resultados Generales',
    '',
    `| Métrica | Valor |`,
    `|---------|-------|`,
    `| Total de tests | ${total} |`,
    `| Pasados | ${passed} ✅ |`,
    `| Fallidos | ${failed} ❌ |`,
    `| Omitidos | ${skipped} ⚠️ |`,
    '',
    '## Por Suite de Tests',
    '',
    '| Suite | Pasados | Fallidos | Duración |',
    '|-------|---------|----------|----------|',
  ]

  for (const row of suiteRows) {
    const status = row.failed > 0 ? '❌' : '✅'
    const dur    = (row.durationMs / 1000).toFixed(1)
    lines.push(`| ${status} ${row.label} | ${row.passed} | ${row.failed} | ${dur}s |`)
  }

  if (failedTests.length > 0) {
    lines.push('', '## Tests Fallidos', '')
    for (const ft of failedTests) {
      lines.push(`### ❌ ${ft.suite} — ${ft.title}`)
      lines.push('```')
      lines.push(ft.error)
      lines.push('```')
      lines.push('')
    }
  } else {
    lines.push('', '## Tests Fallidos', '', '_Ningún test falló. ✅_', '')
  }

  lines.push(
    '## Screenshots',
    '',
    'Todos los screenshots se guardan en: `playwright-report/`',
    '',
    '| Archivo | Descripción |',
    '|---------|-------------|',
    '| login-success.png | Login exitoso → dashboard |',
    '| login-error.png | Error de credenciales en español |',
    '| dashboard-kpis.png | 6 KPI cards con datos del seed |',
    '| dashboard-charts.png | Gráficos Recharts renderizados |',
    '| dashboard-performance.png | Carga < 4 segundos |',
    '| patients-table.png | Tabla de pacientes del seed |',
    '| patients-dni-nodots.png | DNI sin puntos (8 dígitos) |',
    '| patients-search-filtered.png | Búsqueda por nombre |',
    '| patient-created.png | Nuevo paciente registrado |',
    '| calendar-loaded.png | FullCalendar con eventos |',
    '| calendar-timezone.png | Horario Lima (no UTC) |',
    '| appointment-detail-modal.png | Modal de detalle de cita |',
    '| records-list.png | Lista de consultas HCE |',
    '| records-detail.png | Detalle de consulta con diagnóstico |',
    '| pdf-download.png | Descarga de PDF receta |',
    '| billing-list.png | Lista de comprobantes |',
    '| billing-new-invoice.png | Nueva boleta emitida |',
    '| billing-igv-check.png | IGV sin errores de punto flotante |',
    '| admin-tabs.png | Tabs del panel admin |',
    '| theming-palette-changed.png | Cambio de paleta en tiempo real |',
    '',
  )

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf-8')
  console.log(`✅ Report written to: ${OUTPUT_FILE}`)
  console.log(`   Total: ${total} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`)
}

main()

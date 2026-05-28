import type { ThemeConfig } from '@/hooks/useAuth'

interface ThemePreviewProps {
  theme: ThemeConfig
  tenantName: string
}

const FAKE_NAV_ITEMS = ['Inicio', 'Pacientes', 'Citas', 'Historial']

export function ThemePreview({ theme, tenantName }: ThemePreviewProps) {
  const radius = theme.border_radius

  return (
    <div
      style={{
        display: 'flex',
        borderRadius: radius,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        height: 220,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      {/* Mini sidebar */}
      <div
        style={{
          width: 72,
          backgroundColor: theme.sidebar_bg,
          color: theme.sidebar_text,
          padding: '10px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          flexShrink: 0,
        }}
      >
        {/* Logo placeholder */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              width: '100%',
              height: 7,
              backgroundColor: 'rgba(255,255,255,0.35)',
              borderRadius: 3,
              marginBottom: 3,
            }}
          />
          <div
            style={{
              width: '60%',
              height: 5,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 3,
            }}
          />
          <div
            style={{
              width: '80%',
              height: 4,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 3,
              marginTop: 2,
            }}
          />
        </div>

        {/* Nav items */}
        {FAKE_NAV_ITEMS.map((item, i) => (
          <div
            key={item}
            style={{
              width: '100%',
              height: 20,
              backgroundColor: i === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
              borderRadius: 4,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 6,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                backgroundColor: 'rgba(255,255,255,0.5)',
                borderRadius: 2,
                marginRight: 5,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                flex: 1,
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: 2,
              }}
            />
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          backgroundColor: theme.surface,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Topbar */}
        <div
          style={{
            height: 36,
            backgroundColor: theme.primary,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 70,
              height: 7,
              backgroundColor: 'rgba(255,255,255,0.55)',
              borderRadius: 4,
            }}
          />
          <div style={{ flex: 1 }} />
          <div
            style={{
              width: 22,
              height: 22,
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderRadius: '50%',
            }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Page title */}
          <div
            style={{
              width: 90,
              height: 8,
              backgroundColor: '#374151',
              borderRadius: 4,
              opacity: 0.8,
            }}
          />

          {/* Buttons row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '4px 10px',
                backgroundColor: theme.primary,
                borderRadius: radius,
                color: '#ffffff',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              {tenantName.slice(0, 6) || 'Guardar'}
            </div>
            <div
              style={{
                padding: '4px 10px',
                backgroundColor: theme.secondary,
                borderRadius: radius,
                color: '#ffffff',
                fontSize: 9,
                fontWeight: 600,
              }}
            >
              Ver
            </div>
            <div
              style={{
                padding: '4px 10px',
                backgroundColor: theme.primary_light,
                borderRadius: radius,
                color: theme.primary,
                fontSize: 9,
                fontWeight: 600,
                border: `1px solid ${theme.primary}`,
              }}
            >
              Exportar
            </div>
          </div>

          {/* Content card */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: radius,
              border: '1px solid #e5e7eb',
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {[100, 80, 95, 65].map((w, i) => (
              <div
                key={i}
                style={{
                  width: `${w}%`,
                  height: 5,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 3,
                }}
              />
            ))}
            {/* Secondary accent bar */}
            <div
              style={{
                width: '40%',
                height: 5,
                backgroundColor: theme.secondary_light,
                borderRadius: 3,
                border: `1px solid ${theme.secondary}22`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

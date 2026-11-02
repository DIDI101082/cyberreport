# CyberReport — by Accusys Technology

Plataforma SaaS para generación de reportes de hacking ético e infraestructura con IA.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **IA**: Claude API (Anthropic) — genera descripciones, impacto y recomendaciones
- **Exportación**: PDF (jsPDF) + PowerPoint (pptxgenjs)
- **Deploy**: Vercel

---

## Setup local

### 1. Clonar e instalar dependencias

```bash
git clone <tu-repo>
cd cyberreport
npm install
```

### 2. Variables de entorno

Copiar el ejemplo y completar con tus credenciales:

```bash
cp .env.local.example .env.local
```

Editar `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 3. Base de datos

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el archivo `cyberreport_schema.sql`
3. Crear el primer usuario en **Authentication → Users → Add user**

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── ai/generate-finding/    # POST: genera contenido con Claude
│   │   ├── reports/pdf/            # POST: exporta PDF
│   │   └── reports/pptx/           # POST: exporta PowerPoint
│   ├── dashboard/                  # Vista principal
│   ├── login/                      # Autenticación
│   ├── organizations/              # CRUD de clientes
│   ├── projects/                   # Lista + detalle + nuevo
│   │   └── [id]/
│   │       ├── findings/           # Gestión de hallazgos
│   │       └── report/             # Generación de reportes
│   ├── reports/                    # Historial de reportes
│   └── settings/                   # Config de la plataforma
├── components/
│   ├── layout/Sidebar.tsx          # Navegación lateral
│   └── ui/SeverityBadge.tsx        # Badge de severidad
├── lib/
│   ├── ai/generate-finding.ts      # Helper IA
│   ├── reports/
│   │   ├── pdf.ts                  # Generador PDF
│   │   └── pptx.ts                 # Generador PPTX
│   ├── supabase/                   # Clientes Supabase
│   └── utils/severity.ts           # Utilidades de severidad
└── types/index.ts                  # Tipos TypeScript
```

---

## Frameworks normativos soportados

| Framework | Versión |
|-----------|---------|
| ISO 27001 | 2022 |
| PCI-DSS | v4.0 |
| NIST CSF | 2.0 |

---

## Deploy en Vercel

1. Subir código a GitHub
2. Importar el repo en [vercel.com](https://vercel.com)
3. Configurar las variables de entorno en Vercel Dashboard
4. Vercel detecta automáticamente Next.js y despliega

---

## Licencia

Propiedad de Accusys Technology. Uso interno y comercial bajo contrato.

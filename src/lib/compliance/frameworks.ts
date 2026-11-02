/**
 * Compliance frameworks data
 * Maps CWE IDs and finding categories to framework controls
 */

export type FrameworkId = 'iso27001' | 'pci_dss' | 'nist_csf'

export interface Control {
  id: string
  title: string
  description: string
  category: string
}

export interface Framework {
  id: FrameworkId
  name: string
  version: string
  color: string
  controls: Control[]
}

// ── ISO 27001:2022 ────────────────────────────────────────────────────────────
const ISO27001_CONTROLS: Control[] = [
  { id: 'A.5.1',  category: 'Políticas',           title: 'Políticas de seguridad de la información',    description: 'Definir, aprobar, publicar y revisar políticas de seguridad.' },
  { id: 'A.5.15', category: 'Control de acceso',   title: 'Control de acceso',                           description: 'Reglas para controlar el acceso físico y lógico a la información.' },
  { id: 'A.5.16', category: 'Control de acceso',   title: 'Gestión de identidades',                      description: 'Ciclo de vida completo de identidades de usuarios.' },
  { id: 'A.5.17', category: 'Control de acceso',   title: 'Información de autenticación',                description: 'Gestión segura de credenciales y secretos de autenticación.' },
  { id: 'A.8.2',  category: 'Activos',             title: 'Clasificación de la información',             description: 'Clasificar la información según requisitos legales y de negocio.' },
  { id: 'A.8.5',  category: 'Control de acceso',   title: 'Autenticación segura',                        description: 'Implementar autenticación segura según la criticidad del sistema.' },
  { id: 'A.8.8',  category: 'Vulnerabilidades',    title: 'Gestión de vulnerabilidades técnicas',        description: 'Identificar, evaluar y corregir vulnerabilidades técnicas a tiempo.' },
  { id: 'A.8.9',  category: 'Configuración',       title: 'Gestión de la configuración',                 description: 'Establecer, documentar y mantener configuraciones seguras.' },
  { id: 'A.8.11', category: 'Cifrado',             title: 'Enmascaramiento de datos',                    description: 'Enmascarar o cifrar datos sensibles según política.' },
  { id: 'A.8.12', category: 'Fuga de datos',       title: 'Prevención de fuga de datos',                 description: 'Controles para evitar divulgación no autorizada de información.' },
  { id: 'A.8.20', category: 'Redes',               title: 'Seguridad de redes',                          description: 'Proteger redes y servicios de red contra accesos no autorizados.' },
  { id: 'A.8.21', category: 'Redes',               title: 'Seguridad de servicios de red',               description: 'Identificar mecanismos de seguridad para todos los servicios de red.' },
  { id: 'A.8.22', category: 'Redes',               title: 'Segregación de redes',                        description: 'Segmentar redes con diferentes niveles de confianza.' },
  { id: 'A.8.24', category: 'Cifrado',             title: 'Uso de criptografía',                         description: 'Implementar políticas de uso de controles criptográficos.' },
  { id: 'A.8.25', category: 'Desarrollo',          title: 'Ciclo de vida de desarrollo seguro',          description: 'Incluir seguridad en todas las etapas del desarrollo.' },
  { id: 'A.8.26', category: 'Desarrollo',          title: 'Requisitos de seguridad de aplicaciones',     description: 'Identificar y aprobar requisitos de seguridad para aplicaciones.' },
  { id: 'A.8.28', category: 'Desarrollo',          title: 'Codificación segura',                         description: 'Aplicar principios de codificación segura en el desarrollo.' },
]

// ── PCI DSS 4.0.1 ─────────────────────────────────────────────────────────────
const PCIDSS_CONTROLS: Control[] = [
  { id: 'PCI-1.3', category: 'Red',               title: 'Restricción de conexiones entrantes y salientes',  description: 'Restringir el tráfico de red a lo estrictamente necesario.' },
  { id: 'PCI-2.2', category: 'Configuración',     title: 'Configuración segura de componentes',              description: 'Desarrollar estándares de configuración segura para todos los sistemas.' },
  { id: 'PCI-3.3', category: 'Datos',             title: 'Protección de datos sensibles de autenticación',   description: 'No almacenar datos sensibles de autenticación tras la autorización.' },
  { id: 'PCI-3.5', category: 'Cifrado',           title: 'Protección del número de cuenta principal (PAN)',  description: 'Proteger el PAN con cifrado fuerte en cualquier lugar donde se almacene.' },
  { id: 'PCI-4.2', category: 'Cifrado',           title: 'Cifrado en tránsito',                             description: 'Cifrar el PAN con criptografía fuerte durante la transmisión.' },
  { id: 'PCI-6.2', category: 'Desarrollo',        title: 'Seguridad en el desarrollo de software',          description: 'Desarrollar software con prácticas de seguridad reconocidas.' },
  { id: 'PCI-6.3', category: 'Vulnerabilidades',  title: 'Gestión de vulnerabilidades de seguridad',        description: 'Identificar y abordar vulnerabilidades de seguridad.' },
  { id: 'PCI-6.4', category: 'Aplicaciones web',  title: 'Protección de aplicaciones web',                  description: 'Proteger aplicaciones web frente a ataques conocidos.' },
  { id: 'PCI-7.2', category: 'Acceso',            title: 'Control de acceso a sistemas y datos',            description: 'Denegar el acceso a sistemas y datos por defecto.' },
  { id: 'PCI-8.2', category: 'Autenticación',     title: 'Identificación única de usuarios',                description: 'Asignar identificadores únicos a cada usuario.' },
  { id: 'PCI-8.3', category: 'Autenticación',     title: 'Autenticación de usuarios y administradores',     description: 'Autenticar de forma segura el acceso a sistemas en el entorno de datos.' },
  { id: 'PCI-10.2', category: 'Auditoría',        title: 'Implementación de registros de auditoría',        description: 'Generar registros de auditoría para todos los componentes del sistema.' },
  { id: 'PCI-11.3', category: 'Pruebas',          title: 'Pruebas de penetración',                          description: 'Realizar pruebas de penetración externas e internas periódicamente.' },
]

// ── NIST CSF 2.0 ──────────────────────────────────────────────────────────────
const NISTCSF_CONTROLS: Control[] = [
  { id: 'GV.OC',  category: 'Gobernanza',   title: 'Contexto organizacional',                    description: 'Entender la misión, las partes interesadas y los requisitos legales.' },
  { id: 'GV.RM',  category: 'Gobernanza',   title: 'Estrategia de gestión de riesgos',           description: 'Establecer prioridades, restricciones y tolerancia al riesgo.' },
  { id: 'ID.AM',  category: 'Identificar',  title: 'Gestión de activos',                         description: 'Identificar activos de datos, software, hardware y servicios.' },
  { id: 'ID.RA',  category: 'Identificar',  title: 'Evaluación de riesgos',                      description: 'Identificar y analizar amenazas y vulnerabilidades.' },
  { id: 'PR.AA',  category: 'Proteger',     title: 'Gestión de identidades y accesos',           description: 'Gestionar el acceso a activos en línea con el riesgo identificado.' },
  { id: 'PR.AT',  category: 'Proteger',     title: 'Concienciación y formación',                 description: 'El personal cuenta con la concienciación y formación necesarias.' },
  { id: 'PR.DS',  category: 'Proteger',     title: 'Seguridad de los datos',                     description: 'Los datos son gestionados de forma consistente con la estrategia de riesgo.' },
  { id: 'PR.IP',  category: 'Proteger',     title: 'Procesos y procedimientos de protección',    description: 'Políticas de seguridad, procesos y procedimientos para gestionar los activos.' },
  { id: 'PR.PS',  category: 'Proteger',     title: 'Seguridad de la plataforma',                 description: 'La plataforma tecnológica se gestiona de forma coherente con la estrategia.' },
  { id: 'DE.CM',  category: 'Detectar',     title: 'Monitorización continua',                    description: 'Los activos son monitorizados para detectar anomalías y eventos.' },
  { id: 'DE.AE',  category: 'Detectar',     title: 'Análisis de eventos adversos',               description: 'Analizar anomalías, indicadores de compromiso y otros eventos potenciales.' },
  { id: 'RS.MA',  category: 'Responder',    title: 'Gestión de incidentes',                      description: 'Los incidentes son contenidos, erradicados y recuperados con eficacia.' },
  { id: 'RS.AN',  category: 'Responder',    title: 'Análisis de incidentes',                     description: 'Los incidentes son analizados para apoyar la respuesta eficaz.' },
  { id: 'RC.RP',  category: 'Recuperar',    title: 'Ejecución del plan de recuperación',         description: 'Los planes de recuperación se ejecutan y mantienen.' },
]

export const FRAMEWORKS: Framework[] = [
  {
    id: 'iso27001',
    name: 'ISO 27001',
    version: '2022',
    color: '#60a5fa',
    controls: ISO27001_CONTROLS,
  },
  {
    id: 'pci_dss',
    name: 'PCI DSS',
    version: '4.0.1',
    color: '#f97316',
    controls: PCIDSS_CONTROLS,
  },
  {
    id: 'nist_csf',
    name: 'NIST CSF',
    version: '2.0',
    color: '#a78bfa',
    controls: NISTCSF_CONTROLS,
  },
]

// ── Auto-mapping: CWE → controls ─────────────────────────────────────────────
// Maps common CWE IDs to relevant framework controls
export const CWE_CONTROL_MAP: Record<string, string[]> = {
  // Injection
  'CWE-89':  ['A.8.26', 'A.8.28', 'PCI-6.2', 'PCI-6.4', 'PR.PS'],
  'CWE-77':  ['A.8.26', 'A.8.28', 'PCI-6.2', 'PR.PS'],
  'CWE-78':  ['A.8.26', 'A.8.28', 'PCI-6.2'],
  'CWE-79':  ['A.8.26', 'A.8.28', 'PCI-6.4', 'PR.PS'],
  // Authentication
  'CWE-287': ['A.5.17', 'A.8.5', 'PCI-8.2', 'PCI-8.3', 'PR.AA'],
  'CWE-306': ['A.5.17', 'A.8.5', 'PCI-8.3', 'PR.AA'],
  'CWE-307': ['A.5.17', 'PCI-8.3', 'PR.AA'],
  'CWE-521': ['A.5.17', 'PCI-8.3'],
  // Cryptography
  'CWE-326': ['A.8.24', 'PCI-3.5', 'PCI-4.2', 'PR.DS'],
  'CWE-327': ['A.8.24', 'PCI-3.5', 'PCI-4.2', 'PR.DS'],
  'CWE-311': ['A.8.11', 'A.8.24', 'PCI-3.5', 'PCI-4.2', 'PR.DS'],
  // Access control
  'CWE-284': ['A.5.15', 'A.5.16', 'PCI-7.2', 'PR.AA'],
  'CWE-285': ['A.5.15', 'PCI-7.2', 'PR.AA'],
  'CWE-269': ['A.5.15', 'A.5.16', 'PCI-7.2'],
  // Configuration
  'CWE-16':  ['A.8.9', 'PCI-2.2', 'PR.IP'],
  'CWE-732': ['A.8.9', 'PCI-2.2', 'PR.PS'],
  // Data exposure
  'CWE-200': ['A.8.12', 'PCI-3.3', 'PR.DS'],
  'CWE-312': ['A.8.11', 'PCI-3.3', 'PR.DS'],
  // Network
  'CWE-918': ['A.8.20', 'A.8.22', 'PCI-1.3'],
  'CWE-441': ['A.8.20', 'PCI-1.3'],
  // Vulnerabilities / patching
  'CWE-1035': ['A.8.8', 'PCI-6.3', 'ID.RA'],
  'CWE-1395': ['A.8.8', 'PCI-6.3', 'ID.RA'],
}

// Category → controls fallback when no CWE is available
export const CATEGORY_CONTROL_MAP: Record<string, string[]> = {
  web:               ['A.8.26', 'A.8.28', 'PCI-6.4', 'PR.PS', 'DE.CM'],
  network:           ['A.8.20', 'A.8.21', 'A.8.22', 'PCI-1.3', 'PR.PS'],
  system:            ['A.8.8', 'A.8.9', 'PCI-2.2', 'PCI-6.3', 'ID.RA'],
  social_engineering:['A.5.1', 'PCI-8.2', 'PR.AT', 'GV.OC'],
  physical:          ['A.5.1', 'PR.IP', 'GV.RM'],
  other:             ['A.8.8', 'ID.RA', 'GV.RM'],
}

/** Returns control objects for a given CWE or category */
export function getAutoControls(cweId: string | null | undefined, category: string): {
  framework: FrameworkId
  control: Control
}[] {
  const controlIds = cweId
    ? (CWE_CONTROL_MAP[cweId.toUpperCase()] ?? CATEGORY_CONTROL_MAP[category] ?? [])
    : (CATEGORY_CONTROL_MAP[category] ?? [])

  const results: { framework: FrameworkId; control: Control }[] = []

  for (const fw of FRAMEWORKS) {
    for (const ctrl of fw.controls) {
      if (controlIds.includes(ctrl.id)) {
        results.push({ framework: fw.id, control: ctrl })
      }
    }
  }

  return results
}

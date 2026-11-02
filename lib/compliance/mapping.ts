export interface ControlRef {
  framework: string
  control_id: string
  title: string
  description: string
}

// Mapeo hallazgo → controles normativos por categoría + palabras clave en el título
const CATEGORY_MAP: Record<string, ControlRef[]> = {
  web: [
    { framework: 'ISO 27001:2022', control_id: 'A.8.26', title: 'Seguridad de aplicaciones', description: 'Requisitos de seguridad en el diseño y desarrollo de aplicaciones.' },
    { framework: 'ISO 27001:2022', control_id: 'A.8.28', title: 'Codificación segura', description: 'Principios de ingeniería de software seguro en el desarrollo.' },
    { framework: 'PCI-DSS v4.0',   control_id: '6.2',    title: 'Software desarrollado de forma segura', description: 'El software desarrollado internamente debe seguir prácticas de desarrollo seguro.' },
    { framework: 'PCI-DSS v4.0',   control_id: '6.3',    title: 'Vulnerabilidades de seguridad identificadas y corregidas', description: 'Gestión de vulnerabilidades en aplicaciones web.' },
    { framework: 'NIST CSF 2.0',   control_id: 'PR.PS-4', title: 'Prácticas de seguridad del software', description: 'El software es desarrollado y mantenido de forma segura.' },
    { framework: 'OWASP Top 10',   control_id: 'A01:2021', title: 'Control de Acceso Roto', description: 'Revisión de controles de autorización y acceso.' },
  ],
  infrastructure: [
    { framework: 'ISO 27001:2022', control_id: 'A.8.8',  title: 'Gestión de vulnerabilidades técnicas', description: 'Identificación oportuna de vulnerabilidades técnicas y su corrección.' },
    { framework: 'ISO 27001:2022', control_id: 'A.8.20', title: 'Seguridad de redes', description: 'Protección de redes y servicios de red.' },
    { framework: 'ISO 27001:2022', control_id: 'A.8.21', title: 'Seguridad de servicios de red', description: 'Controles de seguridad aplicables a los servicios de red.' },
    { framework: 'PCI-DSS v4.0',   control_id: '6.3.3',  title: 'Parches y actualizaciones de seguridad', description: 'Todos los componentes del sistema están protegidos con parches.' },
    { framework: 'PCI-DSS v4.0',   control_id: '11.3',   title: 'Vulnerabilidades externas e internas', description: 'Escaneo de vulnerabilidades externas e internas.' },
    { framework: 'NIST CSF 2.0',   control_id: 'ID.RA-1', title: 'Identificación de vulnerabilidades', description: 'Los activos son inventariados y las vulnerabilidades son identificadas.' },
    { framework: 'NIST CSF 2.0',   control_id: 'PR.IP-12', title: 'Plan de gestión de vulnerabilidades', description: 'Se desarrolla e implementa un plan de gestión de vulnerabilidades.' },
  ],
  network: [
    { framework: 'ISO 27001:2022', control_id: 'A.8.20', title: 'Seguridad de redes', description: 'Los controles de red deben aplicarse para proteger la información.' },
    { framework: 'ISO 27001:2022', control_id: 'A.8.22', title: 'Separación de redes', description: 'Los grupos de servicios, usuarios y sistemas de información deben segregarse.' },
    { framework: 'PCI-DSS v4.0',   control_id: '1.3',    title: 'Acceso a la red restringido', description: 'Acceso a la red entre entornos de datos del titular de la tarjeta y otras redes restringido.' },
    { framework: 'NIST CSF 2.0',   control_id: 'PR.AC-5', title: 'Protección de integridad de red', description: 'La integridad de la red está protegida, con segregación de red donde corresponde.' },
  ],
  social: [
    { framework: 'ISO 27001:2022', control_id: 'A.6.3',  title: 'Concienciación, educación y capacitación', description: 'El personal debe estar entrenado en seguridad de la información.' },
    { framework: 'ISO 27001:2022', control_id: 'A.6.4',  title: 'Procesos disciplinarios', description: 'Proceso disciplinario formal para violaciones de seguridad.' },
    { framework: 'NIST CSF 2.0',   control_id: 'PR.AT-1', title: 'Concienciación del personal', description: 'Todo el personal está informado y capacitado.' },
  ],
  physical: [
    { framework: 'ISO 27001:2022', control_id: 'A.7.1',  title: 'Perímetros de seguridad física', description: 'Se definen y usan perímetros de seguridad para proteger áreas con información.' },
    { framework: 'ISO 27001:2022', control_id: 'A.7.2',  title: 'Controles de entrada física', description: 'Las áreas seguras están protegidas por controles de entrada apropiados.' },
    { framework: 'PCI-DSS v4.0',   control_id: '9.1',    title: 'Controles de acceso físico', description: 'Los controles de acceso físico gestionan el acceso de las personas a los sistemas.' },
  ],
}

// Controles adicionales por palabras clave en el título
const KEYWORD_MAP: Array<{ keywords: string[]; controls: ControlRef[] }> = [
  {
    keywords: ['sql injection', 'sqli', 'inyección sql'],
    controls: [
      { framework: 'OWASP Top 10', control_id: 'A03:2021', title: 'Inyección', description: 'Vulnerabilidades de inyección SQL, NoSQL, OS y LDAP.' },
      { framework: 'CWE', control_id: 'CWE-89', title: 'Improper Neutralization of SQL Commands', description: 'SQL Injection.' },
    ],
  },
  {
    keywords: ['xss', 'cross-site scripting', 'cross site scripting'],
    controls: [
      { framework: 'OWASP Top 10', control_id: 'A03:2021', title: 'Inyección', description: 'Incluye Cross-Site Scripting (XSS).' },
      { framework: 'CWE', control_id: 'CWE-79', title: 'Improper Neutralization of Input During Web Page Generation', description: 'Cross-site Scripting.' },
    ],
  },
  {
    keywords: ['autenticación', 'authentication', 'mfa', 'contraseña', 'password', 'credentials'],
    controls: [
      { framework: 'ISO 27001:2022', control_id: 'A.8.5', title: 'Autenticación segura', description: 'Se implementan tecnologías y procedimientos de autenticación segura.' },
      { framework: 'OWASP Top 10', control_id: 'A07:2021', title: 'Fallas de Identificación y Autenticación', description: 'Vulnerabilidades relacionadas con autenticación y gestión de sesiones.' },
      { framework: 'PCI-DSS v4.0', control_id: '8.3', title: 'Autenticación de usuarios', description: 'Autenticación de usuarios y dispositivos gestionada de forma segura.' },
    ],
  },
  {
    keywords: ['cifrado', 'encryption', 'tls', 'ssl', 'https', 'certificado', 'certificate'],
    controls: [
      { framework: 'ISO 27001:2022', control_id: 'A.8.24', title: 'Uso de criptografía', description: 'Reglas para el uso efectivo y apropiado de la criptografía.' },
      { framework: 'PCI-DSS v4.0', control_id: '4.2', title: 'PAN protegido en transmisión', description: 'PAN protegido con criptografía sólida durante la transmisión.' },
      { framework: 'NIST CSF 2.0', control_id: 'PR.DS-2', title: 'Datos en tránsito protegidos', description: 'Los datos en tránsito están protegidos.' },
    ],
  },
  {
    keywords: ['rdp', 'remote desktop', 'escritorio remoto', 'exposición', 'exposed', 'open port', 'puerto abierto'],
    controls: [
      { framework: 'ISO 27001:2022', control_id: 'A.8.20', title: 'Seguridad de redes', description: 'Protección de la red contra accesos no autorizados.' },
      { framework: 'ISO 27001:2022', control_id: 'A.8.5', title: 'Autenticación segura', description: 'Autenticación requerida para acceso remoto.' },
      { framework: 'PCI-DSS v4.0', control_id: '1.3.2', title: 'Restricción de tráfico entrante', description: 'El tráfico entrante se restringe a lo necesario.' },
    ],
  },
  {
    keywords: ['log', 'registro', 'audit', 'auditoría', 'trazabilidad', 'monitoreo'],
    controls: [
      { framework: 'ISO 27001:2022', control_id: 'A.8.15', title: 'Registro de actividades', description: 'Los registros que registran actividades de usuarios, excepciones y eventos de seguridad son producidos.' },
      { framework: 'PCI-DSS v4.0', control_id: '10.2', title: 'Registros de auditoría', description: 'Los registros de auditoría son implementados para apoyar la detección de anomalías.' },
      { framework: 'NIST CSF 2.0', control_id: 'DE.AE-3', title: 'Datos de eventos agregados', description: 'Datos de eventos son agregados y correlacionados desde múltiples fuentes.' },
    ],
  },
]

export function mapFindingToControls(
  title: string,
  category: string,
  severity: string
): ControlRef[] {
  const controls: ControlRef[] = []
  const seen = new Set<string>()

  function add(c: ControlRef) {
    const key = `${c.framework}::${c.control_id}`
    if (!seen.has(key)) { seen.add(key); controls.push(c) }
  }

  // Por categoría
  const catControls = CATEGORY_MAP[category] ?? CATEGORY_MAP['infrastructure']
  catControls.forEach(add)

  // Por palabras clave en el título
  const titleLower = title.toLowerCase()
  KEYWORD_MAP.forEach(({ keywords, controls: kc }) => {
    if (keywords.some(kw => titleLower.includes(kw))) {
      kc.forEach(add)
    }
  })

  // Si es crítico/alto siempre agregar gestión de vulnerabilidades
  if (severity === 'critical' || severity === 'high') {
    add({ framework: 'ISO 27001:2022', control_id: 'A.8.8', title: 'Gestión de vulnerabilidades técnicas', description: 'Las vulnerabilidades técnicas críticas deben corregirse urgentemente.' })
    add({ framework: 'NIST CSF 2.0', control_id: 'RS.MI-3', title: 'Vulnerabilidades mitigadas', description: 'Los nuevos riesgos identificados son mitigados o aceptados.' })
  }

  return controls
}

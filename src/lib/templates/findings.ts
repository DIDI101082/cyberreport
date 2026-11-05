import type { SeverityLevel } from '@/types'

export interface FindingTemplate {
  id: string
  title: string
  category: string
  severity: SeverityLevel
  cwe_id?: string
  description: string
  impact: string
  recommendation: string
  tags: string[]
}

export const FINDING_TEMPLATES: FindingTemplate[] = [
  // ── OWASP A01 – Broken Access Control ─────────────────────────────────────
  {
    id: 'idor',
    title: 'Insecure Direct Object Reference (IDOR)',
    category: 'web',
    severity: 'high',
    cwe_id: 'CWE-639',
    tags: ['OWASP A01', 'access-control'],
    description:
      'La aplicación expone referencias directas a objetos internos (IDs de base de datos, nombres de archivo) sin verificar que el usuario autenticado tiene permisos para acceder a ese recurso específico. Un atacante puede modificar el valor del parámetro para acceder a recursos de otros usuarios.',
    impact:
      'Un atacante puede leer, modificar o eliminar datos de cualquier usuario del sistema. Dependiendo del recurso expuesto, esto puede incluir información personal, registros financieros o configuración de cuentas.',
    recommendation:
      'Implementar controles de autorización en el lado del servidor para cada acceso a recursos. Utilizar mapeos indirectos (tokens UUID en lugar de IDs secuenciales). Verificar siempre que el recurso solicitado pertenece al usuario autenticado antes de retornar o modificar datos.',
  },
  {
    id: 'broken-access-control',
    title: 'Control de Acceso Roto — Acceso a funciones privilegiadas',
    category: 'web',
    severity: 'high',
    cwe_id: 'CWE-285',
    tags: ['OWASP A01', 'access-control'],
    description:
      'Funciones administrativas o endpoints restringidos son accesibles sin los privilegios requeridos. El control de acceso se realiza únicamente en el frontend (ocultando botones/menús) sin validación en el servidor.',
    impact:
      'Usuarios no autorizados pueden ejecutar acciones privilegiadas: crear/eliminar usuarios, modificar configuración del sistema, acceder a datos sensibles de otros usuarios o de la organización.',
    recommendation:
      'Implementar verificación de roles y permisos en cada endpoint del servidor. Adoptar el principio de mínimo privilegio. Utilizar middleware de autorización centralizado y auditar todos los accesos a funciones sensibles.',
  },

  // ── OWASP A02 – Cryptographic Failures ────────────────────────────────────
  {
    id: 'sensitive-data-cleartext',
    title: 'Transmisión de datos sensibles en texto claro',
    category: 'web',
    severity: 'high',
    cwe_id: 'CWE-319',
    tags: ['OWASP A02', 'cryptography'],
    description:
      'Datos sensibles (credenciales, tokens de sesión, información personal o financiera) son transmitidos sobre HTTP sin cifrado o con configuraciones TLS débiles que permiten downgrade.',
    impact:
      'Un atacante en posición de hombre-en-el-medio (MitM) puede interceptar y leer las credenciales o datos sensibles en tránsito, lo que puede llevar a compromiso de cuentas y robo de información.',
    recommendation:
      'Forzar HTTPS en toda la aplicación con HSTS (Strict-Transport-Security). Deshabilitar TLS 1.0 y 1.1; utilizar únicamente TLS 1.2 o superior. Redirigir automáticamente todo el tráfico HTTP a HTTPS.',
  },
  {
    id: 'weak-password-storage',
    title: 'Almacenamiento inseguro de contraseñas',
    category: 'web',
    severity: 'critical',
    cwe_id: 'CWE-916',
    tags: ['OWASP A02', 'cryptography', 'authentication'],
    description:
      'Las contraseñas de los usuarios se almacenan en texto claro, con cifrado reversible, o usando algoritmos de hash no diseñados para contraseñas (MD5, SHA-1, SHA-256 sin salt).',
    impact:
      'En caso de brecha en la base de datos, todas las contraseñas quedan expuestas inmediatamente. Permite ataques de fuerza bruta offline y compromiso masivo de cuentas, incluyendo reutilización en otros servicios.',
    recommendation:
      'Utilizar algoritmos diseñados específicamente para hashing de contraseñas: bcrypt (factor de trabajo ≥12), scrypt, Argon2id o PBKDF2. Nunca almacenar contraseñas en texto claro o con cifrado reversible.',
  },

  // ── OWASP A03 – Injection ──────────────────────────────────────────────────
  {
    id: 'sql-injection',
    title: 'SQL Injection',
    category: 'web',
    severity: 'critical',
    cwe_id: 'CWE-89',
    tags: ['OWASP A03', 'injection'],
    description:
      'La aplicación construye consultas SQL concatenando directamente datos controlados por el usuario sin parametrización ni sanitización adecuada. Esto permite a un atacante modificar la lógica de las consultas.',
    impact:
      'Un atacante puede extraer el contenido completo de la base de datos (incluyendo credenciales, datos de usuarios y información confidencial), modificar o eliminar datos, y potencialmente ejecutar comandos del sistema operativo dependiendo del motor de base de datos.',
    recommendation:
      'Utilizar consultas parametrizadas (prepared statements) o ORMs que parametricen automáticamente. Nunca concatenar input del usuario directamente en SQL. Aplicar principio de mínimo privilegio a las cuentas de base de datos y validar/sanitizar toda entrada del usuario.',
  },
  {
    id: 'xss-reflected',
    title: 'Cross-Site Scripting (XSS) Reflejado',
    category: 'web',
    severity: 'medium',
    cwe_id: 'CWE-79',
    tags: ['OWASP A03', 'injection', 'xss'],
    description:
      'La aplicación refleja input del usuario en la respuesta HTML sin el escape adecuado. Un atacante puede inyectar código JavaScript malicioso que se ejecuta en el navegador de la víctima cuando accede a una URL manipulada.',
    impact:
      'Robo de cookies de sesión y tokens de autenticación, redirección a sitios maliciosos, modificación del contenido de la página para ataques de phishing, o ejecución de acciones en nombre del usuario afectado.',
    recommendation:
      'Escapar correctamente toda salida de datos en el contexto HTML apropiado (HTML entities, atributos, JavaScript, CSS). Implementar Content Security Policy (CSP) como defensa en profundidad. Utilizar frameworks modernos que escapan automáticamente la salida.',
  },
  {
    id: 'xss-stored',
    title: 'Cross-Site Scripting (XSS) Almacenado',
    category: 'web',
    severity: 'high',
    cwe_id: 'CWE-79',
    tags: ['OWASP A03', 'injection', 'xss'],
    description:
      'La aplicación almacena input del usuario sin sanitizar y lo renderiza directamente en HTML sin el escape adecuado. El código JavaScript malicioso persiste en el servidor y afecta a todos los usuarios que visualicen el contenido.',
    impact:
      'Afectación persistente de múltiples usuarios: robo de sesiones, defacement de la aplicación, distribución de malware, ataques de phishing a escala, o compromiso de cuentas de administradores que visualicen el contenido infectado.',
    recommendation:
      'Sanitizar y validar toda entrada de usuario antes de almacenarla. Escapar toda salida al renderizar en HTML. Implementar una Content Security Policy (CSP) estricta. Usar bibliotecas de sanitización establecidas (DOMPurify para JavaScript, etc.).',
  },
  {
    id: 'command-injection',
    title: 'Inyección de Comandos del Sistema Operativo',
    category: 'web',
    severity: 'critical',
    cwe_id: 'CWE-78',
    tags: ['OWASP A03', 'injection', 'rce'],
    description:
      'La aplicación pasa datos controlados por el usuario como parte de un comando del sistema operativo sin la validación o escape adecuados, permitiendo la ejecución de comandos arbitrarios.',
    impact:
      'Ejecución remota de código (RCE) con los permisos del proceso de la aplicación. El atacante puede tomar control total del servidor, moverse lateralmente en la red interna, exfiltrar datos o instalar malware/backdoors.',
    recommendation:
      'Evitar el uso de funciones que ejecuten comandos del sistema con input del usuario. Si es inevitable, utilizar APIs específicas que separen el comando de los argumentos (no pasar a un shell) y aplicar una lista blanca estricta de valores permitidos.',
  },

  // ── OWASP A04 – Insecure Design ───────────────────────────────────────────
  {
    id: 'missing-rate-limiting',
    title: 'Ausencia de rate limiting en endpoints críticos',
    category: 'web',
    severity: 'medium',
    cwe_id: 'CWE-307',
    tags: ['OWASP A04', 'brute-force'],
    description:
      'Endpoints de autenticación, recuperación de contraseña u otras funciones críticas no implementan limitación de tasa de peticiones, permitiendo que un atacante realice un número ilimitado de intentos.',
    impact:
      'Ataques de fuerza bruta o credential stuffing contra cuentas de usuarios. Enumeración de usuarios, abuso de funciones de envío de emails/SMS, y denegación de servicio por sobrecarga de recursos.',
    recommendation:
      'Implementar rate limiting en todos los endpoints críticos (login, registro, recuperación de contraseña, OTP). Usar bloqueo temporal progresivo, CAPTCHAs tras N intentos fallidos, y alertas de seguridad para actividad inusual.',
  },

  // ── OWASP A05 – Security Misconfiguration ─────────────────────────────────
  {
    id: 'missing-security-headers',
    title: 'Cabeceras de seguridad HTTP faltantes',
    category: 'web',
    severity: 'low',
    cwe_id: 'CWE-693',
    tags: ['OWASP A05', 'headers'],
    description:
      'La aplicación no incluye una o más cabeceras de seguridad HTTP recomendadas: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy, Permissions-Policy.',
    impact:
      'Mayor superficie de ataque para ataques de clickjacking, XSS, MIME sniffing, y fuga de información a través del header Referer. La ausencia de HSTS expone a ataques de downgrade.',
    recommendation:
      'Configurar todas las cabeceras de seguridad relevantes. Usar security headers como X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Strict-Transport-Security con includeSubDomains y preload, y una Content-Security-Policy apropiada.',
  },
  {
    id: 'directory-listing',
    title: 'Directory Listing habilitado',
    category: 'web',
    severity: 'medium',
    cwe_id: 'CWE-548',
    tags: ['OWASP A05', 'information-disclosure'],
    description:
      'El servidor web tiene habilitada la opción de listar el contenido de directorios cuando no existe un archivo índice, exponiendo la estructura de archivos y directorios de la aplicación.',
    impact:
      'Un atacante puede descubrir archivos de configuración, backups, archivos de log, código fuente u otros recursos sensibles que no deberían ser accesibles públicamente.',
    recommendation:
      'Deshabilitar el directory listing en la configuración del servidor web (Nginx: autoindex off; Apache: Options -Indexes). Asegurarse de que todos los directorios tengan un archivo índice o estén protegidos por autenticación.',
  },

  // ── OWASP A06 – Vulnerable & Outdated Components ──────────────────────────
  {
    id: 'outdated-components',
    title: 'Componentes desactualizados con vulnerabilidades conocidas',
    category: 'web',
    severity: 'medium',
    cwe_id: 'CWE-1104',
    tags: ['OWASP A06', 'dependencies'],
    description:
      'La aplicación utiliza librerías, frameworks o componentes con versiones desactualizadas que tienen vulnerabilidades conocidas y públicamente divulgadas (CVEs).',
    impact:
      'Dependiendo de las vulnerabilidades específicas en los componentes desactualizados, el impacto puede variar desde exposición de información hasta ejecución remota de código. Las vulnerabilidades conocidas son frecuentemente explotadas por atacantes automatizados.',
    recommendation:
      'Mantener un inventario de todos los componentes y sus versiones. Monitorear fuentes de vulnerabilidades (NVD, Snyk, Dependabot). Actualizar regularmente las dependencias y aplicar parches de seguridad de forma oportuna.',
  },

  // ── OWASP A07 – Identification & Authentication Failures ──────────────────
  {
    id: 'missing-mfa',
    title: 'Ausencia de autenticación multifactor (MFA)',
    category: 'web',
    severity: 'medium',
    cwe_id: 'CWE-308',
    tags: ['OWASP A07', 'authentication'],
    description:
      'La aplicación no ofrece ni requiere autenticación multifactor para el acceso a cuentas, especialmente para cuentas con privilegios elevados. La autenticación depende únicamente de usuario y contraseña.',
    impact:
      'Las cuentas son vulnerables a ataques de credential stuffing, phishing y fuerza bruta. Una contraseña comprometida es suficiente para acceder completamente a la cuenta, sin ninguna barrera adicional.',
    recommendation:
      'Implementar MFA mediante TOTP (Google Authenticator, Authy), llaves de seguridad (FIDO2/WebAuthn) o SMS/email como mínimo para cuentas privilegiadas. Considerar hacer MFA obligatorio para todos los usuarios según el perfil de riesgo.',
  },
  {
    id: 'weak-session-management',
    title: 'Gestión de sesiones insegura',
    category: 'web',
    severity: 'high',
    cwe_id: 'CWE-384',
    tags: ['OWASP A07', 'authentication', 'session'],
    description:
      'Las cookies de sesión no tienen los atributos de seguridad adecuados (HttpOnly, Secure, SameSite), los tokens de sesión tienen entropía insuficiente, o las sesiones no se invalidan correctamente al cerrar sesión.',
    impact:
      'Robo de sesión mediante XSS (sin HttpOnly), intercepción en tránsito (sin Secure), ataques CSRF (sin SameSite), o secuestro de sesión por tokens predecibles. Las sesiones no invalidadas permiten reutilización tras logout.',
    recommendation:
      'Configurar cookies con atributos HttpOnly, Secure y SameSite=Strict o Lax. Generar tokens de sesión con al menos 128 bits de entropía. Implementar invalidación de sesión al cerrar sesión y vencimiento por inactividad.',
  },

  // ── OWASP A08 – Software and Data Integrity Failures ──────────────────────
  {
    id: 'missing-subresource-integrity',
    title: 'Ausencia de Subresource Integrity (SRI)',
    category: 'web',
    severity: 'low',
    cwe_id: 'CWE-353',
    tags: ['OWASP A08', 'integrity'],
    description:
      'La aplicación carga scripts o estilos desde CDNs externos sin verificar su integridad mediante el atributo integrity (Subresource Integrity). Un CDN comprometido podría servir código malicioso.',
    impact:
      'Si el CDN es comprometido o sufre un ataque de supply chain, el código malicioso se ejecutaría en los navegadores de todos los usuarios de la aplicación sin ninguna detección.',
    recommendation:
      'Agregar atributos integrity y crossorigin a todos los tags <script> y <link> que cargan recursos externos. Generar los hashes SRI con openssl o herramientas como srihash.org al incorporar nuevos recursos.',
  },

  // ── OWASP A09 – Security Logging & Monitoring Failures ────────────────────
  {
    id: 'insufficient-logging',
    title: 'Logging y monitoreo de seguridad insuficiente',
    category: 'web',
    severity: 'low',
    cwe_id: 'CWE-778',
    tags: ['OWASP A09', 'logging'],
    description:
      'La aplicación no registra eventos de seguridad relevantes (intentos de login fallidos, cambios de privilegios, errores de autorización, accesos a datos sensibles) o los logs no son monitoreados ni alertados.',
    impact:
      'Los ataques en curso o las brechas de seguridad pueden pasar desapercibidos durante largos períodos. Sin logs adecuados, el análisis forense post-incidente es difícil o imposible, y no se pueden detectar patrones de ataque.',
    recommendation:
      'Implementar logging estructurado de eventos de seguridad (autenticación, autorización, cambios de datos sensibles). Centralizar logs en un SIEM. Configurar alertas para comportamientos anómalos y retener logs según política de seguridad.',
  },

  // ── OWASP A10 – Server-Side Request Forgery ───────────────────────────────
  {
    id: 'ssrf',
    title: 'Server-Side Request Forgery (SSRF)',
    category: 'web',
    severity: 'high',
    cwe_id: 'CWE-918',
    tags: ['OWASP A10', 'ssrf'],
    description:
      'La aplicación realiza peticiones HTTP a URLs proporcionadas por el usuario sin validar el destino. Un atacante puede hacer que el servidor realice peticiones a recursos internos de la red, metadata de cloud, o servicios internos.',
    impact:
      'Acceso a servicios internos no expuestos al exterior (bases de datos, servicios de administración), lectura del metadata de instancias cloud (credenciales IAM en AWS/GCP/Azure), escaneo de puertos internos y potencial movimiento lateral.',
    recommendation:
      'Validar y sanitizar todas las URLs proporcionadas por el usuario. Usar una lista blanca de dominios/IPs permitidos. Bloquear peticiones a rangos privados (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16). Usar un proxy dedicado con controles.',
  },

  // ── Infraestructura ────────────────────────────────────────────────────────
  {
    id: 'open-ports',
    title: 'Puertos y servicios innecesarios expuestos',
    category: 'infrastructure',
    severity: 'medium',
    cwe_id: 'CWE-1119',
    tags: ['infrastructure', 'network'],
    description:
      'El host expone servicios de administración u otros servicios innecesarios directamente a Internet (SSH, RDP, bases de datos, paneles de administración) sin restricción de acceso por IP o red.',
    impact:
      'Mayor superficie de ataque: los servicios expuestos son susceptibles a ataques de fuerza bruta, explotación de vulnerabilidades en el servicio, o acceso no autorizado si las credenciales son débiles o predeterminadas.',
    recommendation:
      'Cerrar o restringir mediante firewall todos los puertos no necesarios. Acceder a servicios de administración únicamente a través de VPN o jump host. Implementar segmentación de red y principio de mínima exposición.',
  },
  {
    id: 'default-credentials',
    title: 'Credenciales por defecto en servicios',
    category: 'infrastructure',
    severity: 'critical',
    cwe_id: 'CWE-1392',
    tags: ['infrastructure', 'authentication', 'default-credentials'],
    description:
      'Servicios de red, dispositivos o aplicaciones utilizan credenciales predeterminadas de fábrica o instalación (admin/admin, root/root, etc.) que no fueron cambiadas durante la configuración.',
    impact:
      'Acceso total e inmediato al servicio por cualquier atacante que conozca las credenciales predeterminadas (ampliamente documentadas). Compromiso completo del sistema o dispositivo sin necesidad de técnicas avanzadas.',
    recommendation:
      'Cambiar todas las credenciales predeterminadas inmediatamente durante la instalación/configuración. Implementar políticas de contraseñas fuertes. Usar gestores de secretos y rotar credenciales periódicamente.',
  },
  {
    id: 'ssl-tls-weak',
    title: 'Configuración TLS/SSL débil',
    category: 'infrastructure',
    severity: 'medium',
    cwe_id: 'CWE-326',
    tags: ['infrastructure', 'cryptography', 'tls'],
    description:
      'El servidor acepta protocolos TLS desactualizados (TLS 1.0, TLS 1.1, SSLv3) o cipher suites débiles que son vulnerables a ataques conocidos (POODLE, BEAST, SWEET32, etc.).',
    impact:
      'Un atacante puede forzar una negociación a un protocolo o cipher suite débil (downgrade attack) y descifrar el tráfico en tránsito, exponiendo credenciales y datos sensibles.',
    recommendation:
      'Deshabilitar SSLv2, SSLv3, TLS 1.0 y TLS 1.1. Configurar únicamente TLS 1.2 y TLS 1.3. Usar únicamente cipher suites fuertes con Perfect Forward Secrecy. Verificar con ssllabs.com/ssltest apuntando a una calificación A+.',
  },
]

export const TEMPLATE_CATEGORIES = [
  { value: 'all',            label: 'Todos' },
  { value: 'OWASP A01',     label: 'A01 – Broken Access Control' },
  { value: 'OWASP A02',     label: 'A02 – Cryptographic Failures' },
  { value: 'OWASP A03',     label: 'A03 – Injection' },
  { value: 'OWASP A04',     label: 'A04 – Insecure Design' },
  { value: 'OWASP A05',     label: 'A05 – Security Misconfiguration' },
  { value: 'OWASP A06',     label: 'A06 – Outdated Components' },
  { value: 'OWASP A07',     label: 'A07 – Auth Failures' },
  { value: 'OWASP A08',     label: 'A08 – Integrity Failures' },
  { value: 'OWASP A09',     label: 'A09 – Logging Failures' },
  { value: 'OWASP A10',     label: 'A10 – SSRF' },
  { value: 'infrastructure', label: 'Infraestructura' },
]

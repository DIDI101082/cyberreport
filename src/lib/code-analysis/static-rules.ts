import type { StaticRule } from '@/types/code-analysis'

// ─── Reglas estáticas: detección de patrones inseguros ────────────────────────
// Se aplican ANTES del análisis IA para detección rápida y garantizada.
// La IA luego profundiza, contextualiza y genera los fixes.

export const STATIC_RULES: StaticRule[] = [

  // ── INJECTION ─────────────────────────────────────────────────────────────
  {
    id: 'INJ-001',
    name: 'SQL Injection - Concatenación directa',
    severity: 'critical',
    category: 'injection',
    pattern: /`[^`]*\$\{[^}]*\}[^`]*`|['"]\s*\+\s*\w+\s*\+\s*['"](?=.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM))/gi,
    compliance_refs: [
      { framework: 'OWASP', id: 'A03:2021', label: 'Injection', url: 'https://owasp.org/Top10/A03_2021-Injection/' },
      { framework: 'CWE',   id: 'CWE-89',   label: 'SQL Injection' },
      { framework: 'PCI-DSS', id: '6.2.4', label: 'SQL Injection protection' },
    ],
    message: 'Posible SQL Injection: se detecta interpolación de variables en consultas SQL.',
    fix_hint: 'Usar consultas parametrizadas (prepared statements) o un ORM.',
  },
  {
    id: 'INJ-002',
    name: 'Command Injection - exec/spawn con input',
    severity: 'critical',
    category: 'injection',
    pattern: /(?:exec|execSync|spawn|spawnSync|eval)\s*\(\s*[`'"]\s*[^`'"]*\$\{/g,
    compliance_refs: [
      { framework: 'OWASP', id: 'A03:2021', label: 'Injection' },
      { framework: 'CWE',   id: 'CWE-78',   label: 'OS Command Injection' },
    ],
    message: 'Posible Command Injection: ejecución de comandos del SO con variables interpoladas.',
    fix_hint: 'Separar el comando de los argumentos usando arrays. Nunca interpolar input de usuario.',
  },
  {
    id: 'INJ-003',
    name: 'NoSQL Injection - MongoDB',
    severity: 'high',
    category: 'injection',
    pattern: /\$where\s*:|\.find\s*\(\s*req\.|\.findOne\s*\(\s*req\./g,
    compliance_refs: [
      { framework: 'OWASP', id: 'A03:2021', label: 'Injection' },
      { framework: 'CWE',   id: 'CWE-943',  label: 'NoSQL Injection' },
    ],
    message: 'Posible NoSQL Injection con input de request directo en query MongoDB.',
    fix_hint: 'Sanitizar y validar el input antes de usarlo como filtro. Evitar $where.',
  },

  // ── XSS ───────────────────────────────────────────────────────────────────
  {
    id: 'XSS-001',
    name: 'XSS - dangerouslySetInnerHTML',
    severity: 'high',
    category: 'xss',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{[\s\S]*?\}\s*\}/g,
    compliance_refs: [
      { framework: 'OWASP', id: 'A03:2021', label: 'Injection / XSS' },
      { framework: 'CWE',   id: 'CWE-79',   label: 'Cross-site Scripting' },
    ],
    message: 'Uso de dangerouslySetInnerHTML — puede provocar XSS si el contenido no está sanitizado.',
    fix_hint: 'Sanitizar con DOMPurify antes de asignar, o reemplazar con componentes React seguros.',
  },
  {
    id: 'XSS-002',
    name: 'XSS - innerHTML directo',
    severity: 'high',
    category: 'xss',
    pattern: /\.innerHTML\s*=\s*(?!['"`]<[a-z])/g,
    compliance_refs: [
      { framework: 'OWASP', id: 'A03:2021', label: 'Injection / XSS' },
      { framework: 'CWE',   id: 'CWE-79',   label: 'Cross-site Scripting' },
    ],
    message: 'Asignación directa a innerHTML con posible input dinámico.',
    fix_hint: 'Usar textContent o sanitizar el HTML con DOMPurify.',
  },

  // ── SECRETS ───────────────────────────────────────────────────────────────
  {
    id: 'SEC-001',
    name: 'Secret hardcodeado - API Key',
    severity: 'critical',
    category: 'secrets',
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
    compliance_refs: [
      { framework: 'OWASP',   id: 'A02:2021', label: 'Cryptographic Failures' },
      { framework: 'CWE',     id: 'CWE-798',  label: 'Hardcoded Credentials' },
      { framework: 'ISO27001', id: 'A.9.2',   label: 'User access management' },
    ],
    message: 'API Key o secreto hardcodeado en el código fuente.',
    fix_hint: 'Mover a variables de entorno (.env). Nunca commitear secrets al repositorio.',
  },
  {
    id: 'SEC-002',
    name: 'Secret hardcodeado - Password',
    severity: 'critical',
    category: 'secrets',
    pattern: /(?:password|passwd|pwd|secret|token)\s*[=:]\s*['"][^'"]{8,}['"]/gi,
    compliance_refs: [
      { framework: 'CWE',     id: 'CWE-798',  label: 'Hardcoded Credentials' },
      { framework: 'PCI-DSS', id: '8.3.1',    label: 'No hardcoded credentials' },
    ],
    message: 'Posible contraseña o token hardcodeado.',
    fix_hint: 'Usar variables de entorno o un gestor de secretos (Vault, AWS Secrets Manager).',
  },
  {
    id: 'SEC-003',
    name: 'Private Key en código',
    severity: 'critical',
    category: 'secrets',
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
    compliance_refs: [
      { framework: 'CWE',     id: 'CWE-321',  label: 'Use of Hard-coded Cryptographic Key' },
      { framework: 'OWASP',   id: 'A02:2021', label: 'Cryptographic Failures' },
    ],
    message: 'Clave privada (RSA/EC) detectada en el código fuente.',
    fix_hint: 'Eliminar inmediatamente. Revocar la clave y generar una nueva. Usar variables de entorno.',
  },

  // ── CRYPTO ────────────────────────────────────────────────────────────────
  {
    id: 'CRY-001',
    name: 'Algoritmo débil - MD5',
    severity: 'high',
    category: 'crypto',
    pattern: /(?:createHash\s*\(\s*['"]md5['"]|MD5\s*\(|\.md5\s*\()/gi,
    compliance_refs: [
      { framework: 'OWASP',   id: 'A02:2021', label: 'Cryptographic Failures' },
      { framework: 'CWE',     id: 'CWE-327',  label: 'Use of Broken Algorithm' },
      { framework: 'PCI-DSS', id: '4.2.1',    label: 'Strong cryptography' },
    ],
    message: 'Uso de MD5 — algoritmo criptográfico roto y vulnerable a colisiones.',
    fix_hint: 'Reemplazar con SHA-256 o bcrypt (para passwords).',
  },
  {
    id: 'CRY-002',
    name: 'Algoritmo débil - SHA1',
    severity: 'medium',
    category: 'crypto',
    pattern: /createHash\s*\(\s*['"]sha1['"]/gi,
    compliance_refs: [
      { framework: 'OWASP', id: 'A02:2021', label: 'Cryptographic Failures' },
      { framework: 'CWE',   id: 'CWE-327',  label: 'Use of Broken Algorithm' },
    ],
    message: 'SHA-1 está deprecado y no debe usarse para seguridad.',
    fix_hint: 'Migrar a SHA-256 (createHash("sha256")).',
  },
  {
    id: 'CRY-003',
    name: 'Math.random() para tokens/IDs',
    severity: 'high',
    category: 'crypto',
    pattern: /Math\.random\s*\(\s*\)(?=[\s\S]{0,200}(?:token|session|key|id|secret|csrf|nonce))/gi,
    compliance_refs: [
      { framework: 'CWE',   id: 'CWE-338', label: 'Use of Cryptographically Weak PRNG' },
      { framework: 'OWASP', id: 'A02:2021', label: 'Cryptographic Failures' },
    ],
    message: 'Math.random() no es criptográficamente seguro para generación de tokens.',
    fix_hint: 'Usar crypto.randomBytes() o crypto.randomUUID() de Node.js.',
  },

  // ── AUTH ──────────────────────────────────────────────────────────────────
  {
    id: 'AUTH-001',
    name: 'JWT sin verificación de firma',
    severity: 'critical',
    category: 'auth',
    pattern: /jwt\.decode\s*\((?!.*verify)/g,
    compliance_refs: [
      { framework: 'OWASP', id: 'A07:2021', label: 'Identification & Authentication Failures' },
      { framework: 'CWE',   id: 'CWE-347',  label: 'Improper Verification of Cryptographic Signature' },
    ],
    message: 'jwt.decode() no verifica la firma. Un atacante puede forjar tokens.',
    fix_hint: 'Usar jwt.verify() con la clave secreta en todos los casos.',
  },
  {
    id: 'AUTH-002',
    name: 'Comparación de tokens insegura',
    severity: 'high',
    category: 'auth',
    pattern: /(?:token|hash|digest)\s*===?\s*(?:token|hash|digest|req\.|provided)/g,
    compliance_refs: [
      { framework: 'CWE',   id: 'CWE-208', label: 'Observable Timing Discrepancy' },
      { framework: 'OWASP', id: 'A07:2021', label: 'Auth Failures' },
    ],
    message: 'Comparación directa de tokens — vulnerable a timing attacks.',
    fix_hint: 'Usar crypto.timingSafeEqual() para comparar hashes y tokens.',
  },

  // ── PATH TRAVERSAL ────────────────────────────────────────────────────────
  {
    id: 'PATH-001',
    name: 'Path Traversal - input en rutas de archivo',
    severity: 'high',
    category: 'path_traversal',
    pattern: /(?:readFile|writeFile|readFileSync|createReadStream)\s*\(\s*(?:req\.|res\.|params\.|query\.|\w+Path)/g,
    compliance_refs: [
      { framework: 'OWASP', id: 'A01:2021', label: 'Broken Access Control' },
      { framework: 'CWE',   id: 'CWE-22',   label: 'Path Traversal' },
    ],
    message: 'Input del usuario usado directamente en operaciones de archivos.',
    fix_hint: 'Validar con path.resolve() y verificar que la ruta esté dentro del directorio permitido.',
  },

  // ── SSRF ──────────────────────────────────────────────────────────────────
  {
    id: 'SSRF-001',
    name: 'SSRF - fetch/axios con URL dinámica',
    severity: 'high',
    category: 'ssrf',
    pattern: /(?:fetch|axios\.get|axios\.post|http\.get|https\.get)\s*\(\s*(?:req\.|params\.|query\.|`[^`]*\$\{)/g,
    compliance_refs: [
      { framework: 'OWASP', id: 'A10:2021', label: 'SSRF' },
      { framework: 'CWE',   id: 'CWE-918',  label: 'Server-Side Request Forgery' },
    ],
    message: 'Posible SSRF: URL controlada por el usuario en una petición HTTP del servidor.',
    fix_hint: 'Validar la URL contra una allowlist. Bloquear ranges de IPs internas (169.254.x.x, 10.x.x.x, etc.).',
  },

  // ── LOGGING INSEGURO ──────────────────────────────────────────────────────
  {
    id: 'LOG-001',
    name: 'Logging de datos sensibles',
    severity: 'medium',
    category: 'logging',
    pattern: /console\.log\s*\([^)]*(?:password|token|secret|key|credit|card|ssn|cvv)[^)]*\)/gi,
    compliance_refs: [
      { framework: 'OWASP',   id: 'A09:2021', label: 'Security Logging Failures' },
      { framework: 'PCI-DSS', id: '3.3',      label: 'Do not log sensitive data' },
      { framework: 'ISO27001', id: 'A.12.4',  label: 'Logging and monitoring' },
    ],
    message: 'Posible logging de datos sensibles (contraseña, token, etc.).',
    fix_hint: 'Eliminar o enmascarar datos sensibles en logs. Usar un logger que soporte redaction.',
  },

  // ── ACCESS CONTROL ────────────────────────────────────────────────────────
  {
    id: 'AC-001',
    name: 'CORS permisivo',
    severity: 'medium',
    category: 'access_control',
    pattern: /(?:Access-Control-Allow-Origin|origin)\s*[=:]\s*['"]\*/g,
    compliance_refs: [
      { framework: 'OWASP', id: 'A01:2021', label: 'Broken Access Control' },
      { framework: 'CWE',   id: 'CWE-942',  label: 'Permissive CORS' },
    ],
    message: 'CORS configurado con wildcard (*) — permite peticiones de cualquier origen.',
    fix_hint: 'Definir una allowlist explícita de dominios permitidos.',
  },
  {
    id: 'AC-002',
    name: 'Desactivación de verificación SSL',
    severity: 'critical',
    category: 'access_control',
    pattern: /(?:rejectUnauthorized|NODE_TLS_REJECT_UNAUTHORIZED)\s*[=:]\s*(?:false|['"]0['"])/g,
    compliance_refs: [
      { framework: 'OWASP',   id: 'A02:2021', label: 'Cryptographic Failures' },
      { framework: 'CWE',     id: 'CWE-295',  label: 'Improper Certificate Validation' },
      { framework: 'PCI-DSS', id: '4.2.1',    label: 'TLS verification required' },
    ],
    message: 'Verificación SSL/TLS desactivada — vulnerable a ataques MITM.',
    fix_hint: 'Nunca deshabilitar rejectUnauthorized en producción. Usar certificados válidos.',
  },

  // ── DESERIALIZATION ───────────────────────────────────────────────────────
  {
    id: 'DES-001',
    name: 'Deserialización insegura - eval con JSON',
    severity: 'critical',
    category: 'deserialization',
    pattern: /eval\s*\(\s*(?:JSON|req\.|res\.|data|body|input)/g,
    compliance_refs: [
      { framework: 'OWASP', id: 'A08:2021', label: 'Insecure Deserialization' },
      { framework: 'CWE',   id: 'CWE-502',  label: 'Deserialization of Untrusted Data' },
    ],
    message: 'eval() con datos del usuario — puede ejecutar código arbitrario.',
    fix_hint: 'Usar JSON.parse() y validar el schema con zod o joi.',
  },
]

// Lenguajes soportados por extensión
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  '.ts':   'TypeScript',
  '.tsx':  'TypeScript/React',
  '.js':   'JavaScript',
  '.jsx':  'JavaScript/React',
  '.py':   'Python',
  '.php':  'PHP',
  '.java': 'Java',
  '.go':   'Go',
  '.rb':   'Ruby',
  '.cs':   'C#',
  '.cpp':  'C++',
  '.c':    'C',
}

/**
 * Security Rules Configuration
 * All security patterns are defined here for easy maintenance
 * Patterns are compiled at startup for maximum performance
 */

export interface SecurityRule {
  name: string;
  reason: string;
  statusCode: number;
}

// Dangerous file extensions
export const DANGEROUS_EXTENSIONS =
  /\.(php|env|asp|aspx|jsp|cgi|bak|sql|htaccess|htpasswd|exe|dll)$/i;

// Path traversal attempts
export const PATH_TRAVERSAL =
  /(\.\.[\/\\]|%2e%2e%2f|%2e%2e\/|\.\.%2f|%2e%2e%5c)/i;

// SQL Injection patterns
export const SQL_INJECTION_URL =
  /(union\s+(all\s+)?select|'\s*or\s*'1'\s*=\s*'1|'\s*or\s*1\s*=\s*1|admin'\s*--|'\s*;\s*drop\s|'\s*;\s*delete\s|'\s*;\s*insert\s|'\s*;\s*update\s)/i;

// XSS patterns
export const XSS_PATTERNS =
  /(<script[\s>]|javascript\s*:|<iframe[\s>]|<object[\s>]|<embed[\s>]|onerror\s*=|onload\s*=)/i;

// Command injection pattern
export const COMMAND_INJECTION =
  /(\$\(|`[^`]+`|;\s*(cat|ls|rm|wget|curl|bash|sh|nc|netcat)\s|%0a|%0d)/i;

// Paths that vulnerability scanners specifically look for
export const SCANNER_PATHS: readonly string[] = [
  // WordPress attack vectors
  '/wp-admin',
  '/wp-login.php',
  '/wp-config.php',
  '/xmlrpc.php',

  // PHP admin panels
  '/phpmyadmin',
  '/pma',
  '/adminer.php',
  '/phpinfo.php',

  // Version control (direct access attempts)
  '/.git/config',
  '/.git/HEAD',
  '/.env',
  '/.svn/entries',

  // Backup files
  '/database.sql',
  '/db.sql',
  '/dump.sql',
  '/backup.sql',
  '/backup.zip',
  '/backup.tar.gz',

  // Web shells
  '/c99.php',
  '/r57.php',
  '/shell.php',
  '/webshell.php',

  // Common vulnerability probes
  '/administrator/',
  '/admin.php',
  '/server-status',
  '/server-info',
] as const;

// Known malicious User-Agents (security scanners and exploit tools ONLY)
export const MALICIOUS_USER_AGENTS: readonly string[] = [
  'sqlmap',
  'nikto',
  'nessus',
  'acunetix',
  'netsparker',
  'w3af',
  'wpscan',
  'joomscan',

  // Exploitation frameworks
  'metasploit',
  'havij',
  'pangolin',

  // Directory brute-forcers
  'gobuster',
  'dirbuster',
  'dirb/',
  'wfuzz',
  'ffuf',

  // Known bad bots
  'zgrab',
  'masscan',
] as const;

// Headers that indicate host header injection attacks
export const SUSPICIOUS_HEADERS: readonly string[] = [
  'x-original-url',
  'x-rewrite-url',
] as const;

// Dangerous HTTP methods
export const DANGEROUS_METHODS: readonly string[] = ['TRACE', 'TRACK'] as const;

// Compiled Set for O(1) lookup
export const SCANNER_PATHS_SET = new Set(
  SCANNER_PATHS.map((p) => p.toLowerCase()),
);

export const MALICIOUS_UA_SET = new Set(
  MALICIOUS_USER_AGENTS.map((ua) => ua.toLowerCase()),
);

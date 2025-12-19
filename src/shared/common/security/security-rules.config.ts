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

export const DANGEROUS_EXTENSIONS = /\.(php|env|git|asp|aspx|jsp|cgi|bak|sql|config|ini|log|sh|bash|exe|dll|htaccess|htpasswd|swp|old|orig|dist|save|conf|cfg)$/i;

export const PATH_TRAVERSAL = /(\.\.|%2e%2e|%252e|\.%2e|%2e\.)/i;

export const SQL_INJECTION_URL = /(union\s+(all\s+)?select|select\s+[\w\*]+\s+from|insert\s+into|delete\s+from|drop\s+(table|database)|update\s+\w+\s+set|or\s+1\s*=\s*1|and\s+1\s*=\s*1|'\s*or\s*'|--\s*$|;\s*--)/i;

export const XSS_PATTERNS = /(<script|javascript:|on\w+\s*=|<iframe|<object|<embed|<svg\s+on|<img\s+.*?on\w+)/i;

export const COMMAND_INJECTION = /(\||;|\$\(|`|>\s*\/|<\s*\/|&&|\|\||%0a|%0d)/i;

export const SUSPICIOUS_PATHS: readonly string[] = [
    'wp-admin', 'wp-content', 'wp-includes', 'wp-login', 'wp-config',
    'xmlrpc.php', 'wp-cron',
    'phpmyadmin', 'pma', 'myadmin', 'mysql', 'mysqladmin',
    'phpinfo', 'php-info', 'info.php', 'test.php', 'i.php',
    'adminer', 'dbadmin',
    '.env', '.git', '.svn', '.hg', '.bzr',
    '.htaccess', '.htpasswd', '.ds_store',
    'config.php', 'configuration.php', 'settings.php',
    'web.config', 'config.yml', 'config.json',
    '.aws', '.ssh', '.bash_history', '.npmrc',

    'joomla', 'drupal', 'magento', 'prestashop',
    'administrator', 'admin.php', 'login.php',
    'backup', '.bak', '.backup', '.old', '.save',
    'database.sql', 'db.sql', 'dump.sql',
    'debug', 'test', 'dev', 'staging',
    'phpunit', 'vendor/phpunit',
    '.vscode', '.idea', 'node_modules',

    'server-status', 'server-info',
    '.well-known/security', 'crossdomain.xml',
    'robots.txt.bak', 'sitemap.xml.bak',
    'swagger', 'api-docs', 'graphql',
    'shell', 'c99', 'r57', 'webshell',
    'filemanager', 'elfinder',
    'upload.php', 'uploader',
] as const;

export const MALICIOUS_USER_AGENTS: readonly string[] = [
    'sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'zmap',
    'gobuster', 'dirbuster', 'dirb', 'wfuzz', 'ffuf',
    'nuclei', 'jaeles', 'xray', 'afrog',
    'acunetix', 'netsparker', 'burpsuite', 'owasp',
    'w3af', 'skipfish', 'arachni', 'vega', 'grabber',
    'wpscan', 'joomscan', 'droopescan',

    'havij', 'pangolin', 'hydra', 'medusa',
    'metasploit', 'cobalt', 'beef',
    'python-requests', 'python-urllib', 'go-http-client',
    'curl/', 'wget/', 'libwww-perl',
    'scrapy', 'httpclient', 'java/',
    'petalbot', 'ahrefsbot', 'semrushbot', 'dotbot',
    'mj12bot', 'blexbot', 'seokicks',
    'mozilla/4.0', 'mozilla/5.0 ()', '-',
] as const;

export const SUSPICIOUS_HEADERS: readonly string[] = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url',
] as const;

export const DANGEROUS_METHODS: readonly string[] = [
    'TRACE', 'TRACK', 'DEBUG', 'CONNECT',
] as const;

export const SUSPICIOUS_PATHS_SET = new Set(
    SUSPICIOUS_PATHS.map(p => p.toLowerCase())
);

export const MALICIOUS_UA_SET = new Set(
    MALICIOUS_USER_AGENTS.map(ua => ua.toLowerCase())
);

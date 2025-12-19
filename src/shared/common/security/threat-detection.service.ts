import { Injectable, Logger } from '@nestjs/common';
import {
    DANGEROUS_EXTENSIONS,
    PATH_TRAVERSAL,
    SQL_INJECTION_URL,
    XSS_PATTERNS,
    COMMAND_INJECTION,
    SUSPICIOUS_PATHS_SET,
    MALICIOUS_UA_SET,
    DANGEROUS_METHODS,
    SUSPICIOUS_HEADERS,
} from './security-rules.config';

export enum ThreatType {
    NONE = 'NONE',
    DANGEROUS_EXTENSION = 'DANGEROUS_EXTENSION',
    PATH_TRAVERSAL = 'PATH_TRAVERSAL',
    SQL_INJECTION = 'SQL_INJECTION',
    XSS_ATTACK = 'XSS_ATTACK',
    COMMAND_INJECTION = 'COMMAND_INJECTION',
    SUSPICIOUS_PATH = 'SUSPICIOUS_PATH',
    MISSING_USER_AGENT = 'MISSING_USER_AGENT',
    MALICIOUS_USER_AGENT = 'MALICIOUS_USER_AGENT',
    DANGEROUS_METHOD = 'DANGEROUS_METHOD',
    HEADER_INJECTION = 'HEADER_INJECTION',
    OVERSIZED_URL = 'OVERSIZED_URL',
    EXCESSIVE_PARAMS = 'EXCESSIVE_PARAMS',
}

export interface ThreatDetectionResult {
    isThreat: boolean;
    threatType: ThreatType;
    reason: string;
    statusCode: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RequestContext {
    url: string;
    method: string;
    userAgent: string;
    ip: string;
    headers: Record<string, string | string[] | undefined>;
    queryParamsCount: number;
}

@Injectable()
export class ThreatDetectionService {
    private readonly logger = new Logger('ThreatDetection');

    // Cache para URLs ya analizadas (LRU simple)
    private readonly urlCache = new Map<string, ThreatDetectionResult>();
    private readonly MAX_CACHE_SIZE = 1000;
    private readonly MAX_URL_LENGTH = 2048;
    private readonly MAX_QUERY_PARAMS = 50;

    detect(ctx: RequestContext): ThreatDetectionResult {
        // Check cache first
        const cacheKey = `${ctx.method}:${ctx.url}:${ctx.userAgent.substring(0, 50)}`;
        const cached = this.urlCache.get(cacheKey);
        if (cached) return cached;

        const result = this.performDetection(ctx);

        // Cache the result
        if (this.urlCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.urlCache.keys().next().value;
            if (firstKey) this.urlCache.delete(firstKey);
        }
        this.urlCache.set(cacheKey, result);

        return result;
    }

    private performDetection(ctx: RequestContext): ThreatDetectionResult {
        const url = ctx.url.toLowerCase();
        const ua = ctx.userAgent.toLowerCase();

        // 1. Check URL length (DoS prevention)
        if (ctx.url.length > this.MAX_URL_LENGTH) {
            return this.createThreat(ThreatType.OVERSIZED_URL, 'URL Too Long', 414, 'medium');
        }

        // 2. Check excessive query params (DoS prevention)
        if (ctx.queryParamsCount > this.MAX_QUERY_PARAMS) {
            return this.createThreat(ThreatType.EXCESSIVE_PARAMS, 'Too Many Parameters', 400, 'medium');
        }

        // 3. Check dangerous HTTP methods
        if (DANGEROUS_METHODS.includes(ctx.method.toUpperCase())) {
            return this.createThreat(ThreatType.DANGEROUS_METHOD, 'Method Not Allowed', 405, 'high');
        }

        // 4. Check for header injection attempts
        for (const header of SUSPICIOUS_HEADERS) {
            if (ctx.headers[header]) {
                return this.createThreat(ThreatType.HEADER_INJECTION, 'Suspicious Headers Detected', 400, 'high');
            }
        }

        // 5. Check User-Agent
        if (!ctx.userAgent || ctx.userAgent.trim() === '') {
            return this.createThreat(ThreatType.MISSING_USER_AGENT, 'Missing User-Agent', 403, 'medium');
        }

        // 6. Check malicious User-Agents (using Set for O(1) lookup)
        for (const maliciousUA of MALICIOUS_UA_SET) {
            if (ua.includes(maliciousUA)) {
                return this.createThreat(ThreatType.MALICIOUS_USER_AGENT, 'Malicious Bot Detected', 403, 'high');
            }
        }

        // 7. Check dangerous file extensions
        if (DANGEROUS_EXTENSIONS.test(url)) {
            return this.createThreat(ThreatType.DANGEROUS_EXTENSION, 'Forbidden File Type', 403, 'high');
        }

        // 8. Check path traversal
        if (PATH_TRAVERSAL.test(ctx.url)) {
            return this.createThreat(ThreatType.PATH_TRAVERSAL, 'Path Traversal Detected', 400, 'critical');
        }

        // 9. Check SQL injection in URL
        if (SQL_INJECTION_URL.test(decodeURIComponent(ctx.url))) {
            return this.createThreat(ThreatType.SQL_INJECTION, 'SQL Injection Detected', 400, 'critical');
        }

        // 10. Check XSS patterns
        if (XSS_PATTERNS.test(decodeURIComponent(ctx.url))) {
            return this.createThreat(ThreatType.XSS_ATTACK, 'XSS Attack Detected', 400, 'critical');
        }

        // 11. Check command injection
        if (COMMAND_INJECTION.test(ctx.url)) {
            return this.createThreat(ThreatType.COMMAND_INJECTION, 'Command Injection Detected', 400, 'critical');
        }

        // 12. Check suspicious paths (using Set for O(1) lookup)
        for (const suspiciousPath of SUSPICIOUS_PATHS_SET) {
            if (url.includes(suspiciousPath)) {
                return this.createThreat(ThreatType.SUSPICIOUS_PATH, 'Vulnerability Scanner Detected', 404, 'high');
            }
        }

        return {
            isThreat: false,
            threatType: ThreatType.NONE,
            reason: '',
            statusCode: 200,
            severity: 'low',
        };
    }

    private createThreat(
        type: ThreatType,
        reason: string,
        statusCode: number,
        severity: 'low' | 'medium' | 'high' | 'critical'
    ): ThreatDetectionResult {
        return {
            isThreat: true,
            threatType: type,
            reason,
            statusCode,
            severity,
        };
    }

    clearCache(): void {
        this.urlCache.clear();
        this.logger.log('Threat detection cache cleared');
    }
}

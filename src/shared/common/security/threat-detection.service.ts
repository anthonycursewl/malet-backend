import { Injectable, Logger } from '@nestjs/common';
import {
    DANGEROUS_EXTENSIONS,
    PATH_TRAVERSAL,
    SQL_INJECTION_URL,
    XSS_PATTERNS,
    COMMAND_INJECTION,
    SCANNER_PATHS_SET,
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
    SCANNER_PATH = 'SCANNER_PATH',
    MALICIOUS_USER_AGENT = 'MALICIOUS_USER_AGENT',
    DANGEROUS_METHOD = 'DANGEROUS_METHOD',
    HEADER_INJECTION = 'HEADER_INJECTION',
    OVERSIZED_URL = 'OVERSIZED_URL',
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
}

@Injectable()
export class ThreatDetectionService {
    private readonly logger = new Logger('ThreatDetection');

    private readonly urlCache = new Map<string, ThreatDetectionResult>();
    private readonly MAX_CACHE_SIZE = 1000;
    private readonly MAX_URL_LENGTH = 4096;

    detect(ctx: RequestContext): ThreatDetectionResult {
        const cacheKey = `${ctx.method}:${ctx.url}`;
        const cached = this.urlCache.get(cacheKey);
        if (cached) return cached;

        const result = this.performDetection(ctx);

        if (this.urlCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.urlCache.keys().next().value;
            if (firstKey) this.urlCache.delete(firstKey);
        }
        this.urlCache.set(cacheKey, result);

        return result;
    }

    private performDetection(ctx: RequestContext): ThreatDetectionResult {
        const urlPath = this.getUrlPath(ctx.url).toLowerCase();
        const ua = ctx.userAgent.toLowerCase();

        if (ctx.url.length > this.MAX_URL_LENGTH) {
            return this.createThreat(ThreatType.OVERSIZED_URL, 'URL Too Long', 414, 'medium');
        }

        if (DANGEROUS_METHODS.includes(ctx.method.toUpperCase())) {
            return this.createThreat(ThreatType.DANGEROUS_METHOD, 'Method Not Allowed', 405, 'high');
        }

        for (const header of SUSPICIOUS_HEADERS) {
            if (ctx.headers[header]) {
                return this.createThreat(ThreatType.HEADER_INJECTION, 'Suspicious Headers', 400, 'high');
            }
        }

        for (const maliciousUA of MALICIOUS_UA_SET) {
            if (ua.includes(maliciousUA)) {
                return this.createThreat(ThreatType.MALICIOUS_USER_AGENT, 'Malicious Bot Detected', 403, 'high');
            }
        }

        if (DANGEROUS_EXTENSIONS.test(urlPath)) {
            return this.createThreat(ThreatType.DANGEROUS_EXTENSION, 'Forbidden File Type', 403, 'high');
        }

        if (PATH_TRAVERSAL.test(ctx.url)) {
            return this.createThreat(ThreatType.PATH_TRAVERSAL, 'Path Traversal Detected', 400, 'critical');
        }

        try {
            const decodedUrl = decodeURIComponent(ctx.url);
            if (SQL_INJECTION_URL.test(decodedUrl)) {
                return this.createThreat(ThreatType.SQL_INJECTION, 'SQL Injection Detected', 400, 'critical');
            }

            if (XSS_PATTERNS.test(decodedUrl)) {
                return this.createThreat(ThreatType.XSS_ATTACK, 'XSS Attack Detected', 400, 'critical');
            }
        } catch {

        }


        if (COMMAND_INJECTION.test(ctx.url)) {
            return this.createThreat(ThreatType.COMMAND_INJECTION, 'Command Injection Detected', 400, 'critical');
        }

        if (SCANNER_PATHS_SET.has(urlPath)) {
            return this.createThreat(ThreatType.SCANNER_PATH, 'Vulnerability Scanner Detected', 404, 'high');
        }

        return {
            isThreat: false,
            threatType: ThreatType.NONE,
            reason: '',
            statusCode: 200,
            severity: 'low',
        };
    }

    private getUrlPath(url: string): string {
        try {
            const questionMarkIndex = url.indexOf('?');
            return questionMarkIndex > -1 ? url.substring(0, questionMarkIndex) : url;
        } catch {
            return url;
        }
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

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ThreatDetectionService, ThreatType } from '../security/threat-detection.service';
import { generateBlockedPageHtml } from '../security/blocked-page.template';

@Injectable()
export class BotBlockerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('Security');
    private readonly threatDetector: ThreatDetectionService;

    constructor() {
        this.threatDetector = new ThreatDetectionService();
    }

    use(req: Request, res: Response, next: NextFunction) {
        const ctx = {
            url: req.originalUrl || req.url,
            method: req.method,
            userAgent: req.get('user-agent') || '',
            ip: this.extractRealIp(req),
            headers: req.headers as Record<string, string | string[] | undefined>,
        };

        const result = this.threatDetector.detect(ctx);

        if (result.isThreat) {
            this.logThreat(ctx, result);
            return this.sendBlockedResponse(res, result, ctx);
        }

        next();
    }

    private extractRealIp(req: Request): string {
        const cfIp = req.get('cf-connecting-ip');
        const realIp = req.get('x-real-ip');
        const forwardedFor = req.get('x-forwarded-for');

        if (cfIp) return cfIp;
        if (realIp) return realIp;
        if (forwardedFor) return forwardedFor.split(',')[0].trim();

        return req.ip || 'Unknown';
    }

    private logThreat(ctx: { url: string; method: string; ip: string; userAgent: string }, result: { threatType: ThreatType; severity: string }): void {
        const emoji = this.getSeverityEmoji(result.severity);
        this.logger.warn(
            `${emoji} [${result.severity.toUpperCase()}] ${result.threatType} | ` +
            `IP: ${ctx.ip} | ${ctx.method} ${ctx.url.substring(0, 100)} | ` +
            `UA: ${ctx.userAgent.substring(0, 50)}`
        );
    }

    private getSeverityEmoji(severity: string): string {
        switch (severity) {
            case 'critical': return '🚨';
            case 'high': return '🛑';
            case 'medium': return '⚠️';
            default: return '📝';
        }
    }

    private sendBlockedResponse(
        res: Response,
        result: { reason: string; statusCode: number },
        ctx: { ip: string; url: string; method: string }
    ): void {
        const requestId = randomUUID().split('-')[0].toUpperCase();
        const timestamp = new Date().toISOString();

        const acceptHeader = res.req?.get('accept') || '';
        if (acceptHeader.includes('application/json')) {
            res.status(result.statusCode).json({
                error: 'Access Denied',
                reason: result.reason,
                requestId,
                timestamp,
            });
            return;
        }

        const html = generateBlockedPageHtml({
            statusCode: result.statusCode,
            reason: result.reason,
            ip: ctx.ip,
            path: ctx.url,
            requestId,
            timestamp,
            method: ctx.method,
        });

        res.status(result.statusCode).type('html').send(html);
    }
}
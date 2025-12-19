import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom guard for rate limiting that handles correctly
 * the IPs when the application is behind a proxy (like Cloudflare, nginx, etc.)
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
    private readonly logger = new Logger('RateLimiter');

    protected async getTracker(req: Record<string, any>): Promise<string> {
        const cfIp = req.headers['cf-connecting-ip'];
        const realIp = req.headers['x-real-ip'];
        const forwardedFor = req.headers['x-forwarded-for'];

        let ip = cfIp
            || realIp
            || (forwardedFor ? forwardedFor.split(',')[0].trim() : null)
            || req.ip
            || 'unknown';

        return ip;
    }

    protected async throwThrottlingException(
        context: ExecutionContext,
        throttlerLimitDetail: any,
    ): Promise<void> {
        const request = context.switchToHttp().getRequest();
        const ip = await this.getTracker(request);
        const path = request.originalUrl || request.url;

        this.logger.warn(
            `🚫 Rate limit exceeded: IP=${ip}, Path=${path}, ` +
            `Limit=${throttlerLimitDetail.limit}, TTL=${throttlerLimitDetail.ttl}ms`
        );

        throw new ThrottlerException('Too Many Requests - Please slow down');
    }
}

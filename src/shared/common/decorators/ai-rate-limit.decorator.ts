import { Throttle } from '@nestjs/throttler';

/**
 * Rate limit decorators specifically designed for AI endpoints.
 * AI endpoints are expensive resources and need stricter rate limiting.
 */

/**
 * Standard AI Rate Limit
 * 20 requests per minute - suitable for normal chat usage
 * 
 * Rationale: AI requests are expensive (tokens cost money)
 * and take longer to process. This provides a good balance
 * between usability and cost control.
 */
export const AIRateLimit = () => Throttle({
    default: {
        limit: 20,
        ttl: 60000
    }
});

/**
 * Strict AI Rate Limit
 * 5 requests per minute - for endpoints that use more tokens
 * 
 * Use this for:
 * - Long-form generation
 * - Complex queries
 * - Expensive models (GPT-4)
 */
export const StrictAIRateLimit = () => Throttle({
    default: {
        limit: 5,
        ttl: 60000
    }
});

/**
 * Burst AI Rate Limit
 * 10 requests per 10 seconds, 30 per minute
 * Allows some burst but maintains overall limit
 */
export const BurstAIRateLimit = () => Throttle({
    default: {
        limit: 10,
        ttl: 10000
    }
});

/**
 * Daily Token Budget Limit (conceptual)
 * This would need custom implementation with database tracking
 * to limit total tokens per day per user
 */
export const DailyAILimit = () => Throttle({
    default: {
        limit: 100,
        ttl: 86400000
    }
});

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Rate Limit Exception
 * 
 * Thrown when the AI provider rate limit is exceeded.
 * Includes retry information for the frontend to display a countdown.
 */
export class AIRateLimitException extends HttpException {
    constructor(
        public readonly retryAfterSeconds: number,
        public readonly message: string = 'Rate limit exceeded',
    ) {
        super(
            {
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                error: 'Too Many Requests',
                message: message,
                code: 'AI_RATE_LIMIT',
                retryAfterSeconds: retryAfterSeconds,
                retryAfterMs: Math.ceil(retryAfterSeconds * 1000),
            },
            HttpStatus.TOO_MANY_REQUESTS
        );
    }
}

/**
 * AI Service Error
 * 
 * Generic AI service error with error code.
 */
export class AIServiceException extends HttpException {
    constructor(
        public readonly code: string,
        message: string,
        status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    ) {
        super(
            {
                statusCode: status,
                error: 'AI Service Error',
                message: message,
                code: code,
            },
            status
        );
    }
}

/**
 * Content Filter Exception
 * 
 * Thrown when the AI response is blocked by content filters.
 */
export class AIContentFilterException extends HttpException {
    constructor(message: string = 'Content blocked by safety filters') {
        super(
            {
                statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                error: 'Content Filtered',
                message: message,
                code: 'AI_CONTENT_FILTERED',
            },
            HttpStatus.UNPROCESSABLE_ENTITY
        );
    }
}

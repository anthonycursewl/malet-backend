import { SkipThrottle, Throttle } from '@nestjs/throttler';

export const StrictRateLimit = () => Throttle({ default: { limit: 5, ttl: 60000 } });
export const ModerateRateLimit = () => Throttle({ default: { limit: 30, ttl: 60000 } });
export const RelaxedRateLimit = () => Throttle({ default: { limit: 100, ttl: 60000 } });
export const VeryStrictRateLimit = () => Throttle({ default: { limit: 3, ttl: 300000 } });
export const NoRateLimit = () => SkipThrottle();

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    this.logger.log(
      `${method} ${originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`,
    );

    if (
      ['POST', 'PUT', 'PATCH'].includes(method) &&
      Object.keys(req.body).length > 0
    ) {
      this.logger.debug('Request Body: ' + JSON.stringify(req.body, null, 2));
    }

    if (Object.keys(req.query).length > 0) {
      this.logger.debug('Query: ' + JSON.stringify(req.query, null, 2));
    }

    if (Object.keys(req.params).length > 0) {
      this.logger.debug('Params: ' + JSON.stringify(req.params, null, 2));
    }

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;
      const responseTime = Date.now() - startTime;

      this.logger.log(
        `${method} ${originalUrl} - ${statusCode} - ${contentLength}b - ${responseTime}ms`,
      );
    });

    next();
  }
}

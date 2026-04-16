import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class TagErrorLoggerFilter implements ExceptionFilter {
  private logger = new Logger('TagErrorLogger');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const path = req?.url || '';

    if (path.startsWith('/tags') || path.startsWith('/transactions')) {
      const status =
        exception instanceof HttpException ? exception.getStatus() : 500;
      const message =
        exception instanceof HttpException
          ? exception.getResponse()
          : exception;
      const msg =
        typeof message === 'string' ? message : JSON.stringify(message);
      this.logger.error(
        `${req.method} ${path} - ${status}: ${msg}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message =
      exception instanceof HttpException ? exception.getResponse() : exception;
    if (res && typeof res.status === 'function') {
      res.status(status).json({ statusCode: status, message });
    }
  }
}

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

    this.logger.error(
      `${req.method} ${path}: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    let status: number;
    let body: Record<string, any>;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        body = { statusCode: status, message: responseBody };
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        body = { ...responseBody, statusCode: status };
        if (
          body.message !== undefined &&
          body.message !== null &&
          typeof body.message !== 'string' &&
          !Array.isArray(body.message)
        ) {
          body.message = exception.message;
        }
        if (body.message === undefined || body.message === null) {
          body.message = exception.message;
        }
      } else {
        body = { statusCode: status, message: exception.message };
      }
    } else {
      status = 500;
      body = { statusCode: 500, message: 'Internal server error' };
    }

    if (res && typeof res.status === 'function') {
      res.status(status).json(body);
    }
  }
}

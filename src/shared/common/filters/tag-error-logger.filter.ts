import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class TagErrorLoggerFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const path = req?.url || '';
    // Log only tag-related paths for focused debugging
    if (path.startsWith('/tags') || path.startsWith('/transactions')) {
      const status =
        exception instanceof HttpException ? exception.getStatus() : 500;
      const message =
        exception instanceof HttpException
          ? exception.getResponse()
          : exception;
      const label = '\x1b[91m[TAG-ERROR-SYSTEM]\x1b[0m'; // red
      const pink = '\x1b[35m'; // pink
      const reset = '\x1b[0m';
      const msg =
        typeof message === 'string' ? message : JSON.stringify(message);
      console.error(
        `${label} ${pink}${req.method} ${path} - ${status}: ${msg}${reset}`,
      );
      if (exception instanceof Error && exception.stack) {
        console.error(pink + exception.stack + reset);
      }
    }

    // Propagar el error al cliente con la respuesta por defecto
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message =
      exception instanceof HttpException ? exception.getResponse() : exception;
    if (res && typeof res.status === 'function') {
      res.status(status).json({ statusCode: status, message });
    }
  }
}

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    // Registrar la petición entrante
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`);
    
    // Registrar el cuerpo de la petición (excepto para ciertos métodos)
    if (['POST', 'PUT', 'PATCH'].includes(method) && Object.keys(req.body).length > 0) {
      console.log('Request Body:', JSON.stringify(req.body, null, 2));
    }

    // Registrar los parámetros de consulta si existen
    if (Object.keys(req.query).length > 0) {
      console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
    }

    // Registrar los parámetros de ruta si existen
    if (Object.keys(req.params).length > 0) {
      console.log('Route Parameters:', JSON.stringify(req.params, null, 2));
    }

    // Registrar los headers si se desea (opcional, puede contener información sensible)
    // console.log('Headers:', JSON.stringify(req.headers, null, 2));

    // Registrar la respuesta cuando termine
    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;
      const responseTime = Date.now() - startTime;
      
      console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} - Status: ${statusCode} - ${contentLength}b - ${responseTime}ms`);
    });

    next();
  }
}

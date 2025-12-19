import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BotBlockerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('SecurityBot');

    use(req: Request, res: Response, next: NextFunction) {
        const ua = req.get('user-agent') || '';
        const realIp = req.get('cf-connecting-ip') || req.ip;
        const url = req.originalUrl.toLowerCase();

        if (url.match(/\.(php|env|git|asp|aspx|jsp)$/)) {
            this.logger.warn(`🛑 Blocking vulnerability scanner [${realIp}] searching for: ${url}`);
            return res.status(444).send();
        }

        if (!ua || ua.trim() === '') {
            this.logger.warn(`🛑 Blocking bot without User-Agent [${realIp}]`);
            return res.status(403).send('Forbidden');
        }

        next();
    }
}
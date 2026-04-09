import { Controller, Post, Get, Body, Param, Req, Inject, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { INIT_WEB_SESSION_USE_CASE, InitWebSessionUseCase } from '../../../domain/ports/in/init-web-session.usecase';
import { AUTHORIZE_WEB_SESSION_USE_CASE, AuthorizeWebSessionUseCase } from '../../../domain/ports/in/authorize-web-session.usecase';
import { GET_WEB_SESSION_STATUS_USE_CASE, GetWebSessionStatusUseCase } from '../../../domain/ports/in/get-web-session-status.usecase';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('web-auth')
export class WebAuthController {
    constructor(
        @Inject(INIT_WEB_SESSION_USE_CASE)
        private readonly initUseCase: InitWebSessionUseCase,
        @Inject(AUTHORIZE_WEB_SESSION_USE_CASE)
        private readonly authorizeUseCase: AuthorizeWebSessionUseCase,
        @Inject(GET_WEB_SESSION_STATUS_USE_CASE)
        private readonly statusUseCase: GetWebSessionStatusUseCase,
    ) { }

    @Post('init')
    async init(@Req() req: Request) {
        const ip = req.ip || String(req.headers['x-forwarded-for']) || null;
        const userAgent = req.headers['user-agent'] || null;

        return await this.initUseCase.execute(ip, userAgent);
    }

    @Get('status/:token')
    async getStatus(@Param('token') token: string) {
        return await this.statusUseCase.execute(token);
    }

    @Post('authorize')
    @UseGuards(JwtAuthGuard)
    async authorize(@Body('qrCode') qrCode: string, @Req() req: any) {
        const userId = req.user.userId;
        await this.authorizeUseCase.execute(qrCode, userId);
        return { message: 'Authorized successfully' };
    }
}

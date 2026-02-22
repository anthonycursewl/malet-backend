import { OAuth2Client } from 'google-auth-library';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import {
    IGoogleAuthService,
    GoogleUser,
} from '../../domain/ports/out/auth.service';

@Injectable()
export class GoogleAuthService implements IGoogleAuthService {
    private client: OAuth2Client;
    private readonly logger = new Logger(GoogleAuthService.name);

    constructor() {
        this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }

    async validateGoogleToken(token: string): Promise<GoogleUser> {
        try {
            this.logger.debug(`Validating Google token: ${token.substring(0, 10)}...`);
            const ticket = await this.client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            this.logger.debug(`Google payload received: ${JSON.stringify(payload)}`);

            if (!payload) {
                this.logger.error('Invalid Google token: No payload found');
                throw new UnauthorizedException('Token de Google inválido');
            }

            return {
                email: payload.email,
                name: payload.name,
                googleId: payload.sub,
                avatarUrl: payload.picture,
            };
        } catch (error) {
            console.error(error);
            this.logger.error(`Error validating Google token: ${error.message}`, error.stack);
            throw new UnauthorizedException(
                'Error validando token de Google: ' + error.message,
            );
        }
    }
}


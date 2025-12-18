import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { AUTH_GARZON_USE_CASE, AuthGarzonUseCase } from '../../../domain/ports/in/auth-garzon.usecase';
import { LoginGarzonDto } from '../dtos/login-garzon.dto';
import { AuthSession } from '../../../domain/entities/auth.entity';

/**
 * Controller para autenticación contra el sistema Garzon (legado).
 * 
 * Este controller maneja la autenticación de usuarios que necesitan
 * acceder al sistema Laravel legacy.
 * 
 * @example
 * POST /auth/garzon/login
 * { "username": "user", "password": "pass" }
 */
@Controller('auth/garzon')
export class AuthGarzonController {
    constructor(
        @Inject(AUTH_GARZON_USE_CASE)
        private readonly authGarzonUseCase: AuthGarzonUseCase,
    ) { }

    /**
     * Autentica un usuario contra el sistema Garzon.
     * 
     * @param loginDto - Credenciales del usuario (username y password)
     * @returns Sesión autenticada con cookies y tokens CSRF
     * 
     * @throws UnauthorizedException - Si las credenciales son inválidas
     * @throws InternalServerErrorException - Si hay error de conexión con el sistema legado
     */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginGarzonDto): Promise<AuthSession> {
        return this.authGarzonUseCase.execute({
            username: loginDto.username,
            password: loginDto.password,
        });
    }
}

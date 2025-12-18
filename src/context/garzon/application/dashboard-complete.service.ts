import { Injectable, Inject } from '@nestjs/common';
import { AuthCredentials } from '../domain/entities/auth.entity';
import {
    DashboardCompleteRequest,
    DashboardCompleteResponse,
} from '../domain/entities/dashboard-complete.entity';
import {
    AUTH_GARZON_REPOSITORY,
    AuthGarzonRepository,
} from '../domain/ports/out/auth-garzon.repository';
import {
    DASHBOARD_GARZON_REPOSITORY,
    DashboardGarzonRepository,
} from '../domain/ports/out/dashboard-garzon.repository';

/**
 * Servicio que orquesta la autenticación y obtención del dashboard en una sola operación.
 * 
 * Este servicio:
 * 1. Autentica al usuario contra el sistema Garzon
 * 2. Usa la sesión obtenida para obtener todos los datos del dashboard
 * 3. Devuelve toda la información consolidada
 */
@Injectable()
export class DashboardCompleteService {
    constructor(
        @Inject(AUTH_GARZON_REPOSITORY)
        private readonly authRepository: AuthGarzonRepository,
        @Inject(DASHBOARD_GARZON_REPOSITORY)
        private readonly dashboardRepository: DashboardGarzonRepository,
    ) { }

    /**
     * Autentica y obtiene todos los datos del dashboard en una sola llamada.
     * 
     * @param request - Credenciales del usuario y parámetros del dashboard
     * @returns Sesión, usuario y datos del dashboard consolidados
     */
    async getCompleteData(
        request: DashboardCompleteRequest,
    ): Promise<DashboardCompleteResponse> {
        console.log('[DashboardCompleteService] Iniciando autenticación...');

        // 1. Autenticar al usuario
        const credentials: AuthCredentials = {
            username: request.username,
            password: request.password,
        };

        const session = await this.authRepository.login(credentials);
        console.log('[DashboardCompleteService] Autenticación exitosa');

        // 2. Obtener todos los datos del dashboard
        console.log('[DashboardCompleteService] Obteniendo datos del dashboard...');
        const dashboard = await this.dashboardRepository.getAllDashboardData(
            session,
            { stid: request.stid },
        );
        console.log('[DashboardCompleteService] Datos del dashboard obtenidos');

        // 3. Devolver respuesta consolidada
        return {
            session: {
                cookies: session.cookies,
                xsrfToken: session.xsrfToken,
            },
            user: session.user,
            dashboard,
            fetchedAt: new Date().toISOString(),
        };
    }
}

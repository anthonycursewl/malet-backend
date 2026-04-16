import { Injectable, Inject, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(DashboardCompleteService.name);

  constructor(
    @Inject(AUTH_GARZON_REPOSITORY)
    private readonly authRepository: AuthGarzonRepository,
    @Inject(DASHBOARD_GARZON_REPOSITORY)
    private readonly dashboardRepository: DashboardGarzonRepository,
  ) {}

  async getCompleteData(
    request: DashboardCompleteRequest,
  ): Promise<DashboardCompleteResponse> {
    this.logger.debug('Iniciando autenticación...');

    const credentials: AuthCredentials = {
      username: request.username,
      password: request.password,
    };

    const session = await this.authRepository.login(credentials);
    this.logger.debug('Autenticación exitosa');

    this.logger.debug('Obteniendo datos del dashboard...');
    const dashboard = await this.dashboardRepository.getAllDashboardData(
      session,
      { stid: request.stid },
    );
    this.logger.debug('Datos del dashboard obtenidos');

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

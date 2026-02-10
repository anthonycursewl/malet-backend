import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  DASHBOARD_GARZON_USE_CASE,
  DashboardGarzonUseCase,
} from '../../../domain/ports/in/dashboard-garzon.usecase';
import { DashboardRequestDto } from '../dtos/dashboard-garzon.dto';
import { DashboardCompleteRequestDto } from '../dtos/dashboard-complete.dto';
import {
  DashboardData,
  TopCliente,
  TopPago,
  TopProducto,
  VentasPorDepartamento,
  VentasPorTienda,
} from '../../../domain/entities/dashboard.entity';
import { DashboardCompleteResponse } from '../../../domain/entities/dashboard-complete.entity';
import { AuthSession } from '../../../domain/entities/auth.entity';
import { DashboardCompleteService } from '../../../application/dashboard-complete.service';

/**
 * Controller para el Dashboard del sistema Garzon.
 *
 * Expone endpoints para obtener los diferentes datos del dashboard
 * una vez que el usuario está autenticado.
 *
 * Endpoints disponibles:
 * - POST /garzon/dashboard/complete - Autenticación + Dashboard en una sola llamada
 * - POST /garzon/dashboard/ventas-tienda
 * - POST /garzon/dashboard/top-clientes
 * - POST /garzon/dashboard/top-pagos
 * - POST /garzon/dashboard/top-productos
 * - POST /garzon/dashboard/ventas-departamento
 * - POST /garzon/dashboard/all
 */
@Controller('garzon/dashboard')
export class DashboardGarzonController {
  constructor(
    @Inject(DASHBOARD_GARZON_USE_CASE)
    private readonly dashboardUseCase: DashboardGarzonUseCase,
    private readonly dashboardCompleteService: DashboardCompleteService,
  ) {}

  /**
   * Helper para construir el objeto AuthSession desde el DTO
   */
  private buildSession(dto: DashboardRequestDto): AuthSession {
    return {
      cookies: dto.session.cookies,
      xsrfToken: dto.session.xsrfToken,
    };
  }

  /**
   * Autenticación + Dashboard completo en una sola llamada.
   *
   * Este endpoint:
   * 1. Autentica al usuario con las credenciales proporcionadas
   * 2. Obtiene todos los datos del dashboard
   * 3. Devuelve sesión, usuario y dashboard consolidados
   *
   * POST /garzon/dashboard/complete
   *
   * Body:
   * {
   *   "username": "user",
   *   "password": "pass",
   *   "stid": 0
   * }
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async getCompleteDashboard(
    @Body() body: DashboardCompleteRequestDto,
  ): Promise<DashboardCompleteResponse> {
    return this.dashboardCompleteService.getCompleteData({
      username: body.username,
      password: body.password,
      stid: body.stid,
    });
  }

  /**
   * Obtiene ventas por tienda (requiere sesión previa)
   * POST /garzon/dashboard/ventas-tienda
   */
  @Post('ventas-tienda')
  @HttpCode(HttpStatus.OK)
  async getVentasPorTienda(
    @Body() body: DashboardRequestDto,
  ): Promise<VentasPorTienda[]> {
    return this.dashboardUseCase.getVentasPorTienda(this.buildSession(body), {
      stid: body.stid,
    });
  }

  /**
   * Obtiene top de clientes (requiere sesión previa)
   * POST /garzon/dashboard/top-clientes
   */
  @Post('top-clientes')
  @HttpCode(HttpStatus.OK)
  async getTopClientes(
    @Body() body: DashboardRequestDto,
  ): Promise<TopCliente[]> {
    return this.dashboardUseCase.getTopClientes(this.buildSession(body), {
      stid: body.stid,
    });
  }

  /**
   * Obtiene top de métodos de pago (requiere sesión previa)
   * POST /garzon/dashboard/top-pagos
   */
  @Post('top-pagos')
  @HttpCode(HttpStatus.OK)
  async getTopPagos(@Body() body: DashboardRequestDto): Promise<TopPago[]> {
    return this.dashboardUseCase.getTopPagos(this.buildSession(body), {
      stid: body.stid,
    });
  }

  /**
   * Obtiene top de productos (requiere sesión previa)
   * POST /garzon/dashboard/top-productos
   */
  @Post('top-productos')
  @HttpCode(HttpStatus.OK)
  async getTopProductos(
    @Body() body: DashboardRequestDto,
  ): Promise<TopProducto[]> {
    return this.dashboardUseCase.getTopProductos(this.buildSession(body), {
      stid: body.stid,
    });
  }

  /**
   * Obtiene ventas por departamento (requiere sesión previa)
   * POST /garzon/dashboard/ventas-departamento
   */
  @Post('ventas-departamento')
  @HttpCode(HttpStatus.OK)
  async getVentasPorDepartamento(
    @Body() body: DashboardRequestDto,
  ): Promise<VentasPorDepartamento[]> {
    return this.dashboardUseCase.getVentasPorDepartamento(
      this.buildSession(body),
      { stid: body.stid },
    );
  }

  /**
   * Obtiene todos los datos del dashboard (requiere sesión previa)
   * POST /garzon/dashboard/all
   */
  @Post('all')
  @HttpCode(HttpStatus.OK)
  async getAllDashboardData(
    @Body() body: DashboardRequestDto,
  ): Promise<DashboardData> {
    return this.dashboardUseCase.getAllDashboardData(this.buildSession(body), {
      stid: body.stid,
    });
  }
}

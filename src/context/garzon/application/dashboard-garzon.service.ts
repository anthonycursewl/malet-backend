import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { AuthSession } from '../domain/entities/auth.entity';
import {
  DashboardData,
  DashboardQueryParams,
  TopCliente,
  TopPago,
  TopProducto,
  VentasPorDepartamento,
  VentasPorTienda,
} from '../domain/entities/dashboard.entity';
import { DashboardGarzonUseCase } from '../domain/ports/in/dashboard-garzon.usecase';
import {
  DASHBOARD_GARZON_REPOSITORY,
  DashboardGarzonRepository,
} from '../domain/ports/out/dashboard-garzon.repository';

/**
 * Servicio de aplicación que implementa el caso de uso del Dashboard.
 * Coordina entre la capa de dominio y la infraestructura para obtener
 * los datos del dashboard del sistema Garzon.
 */
@Injectable()
export class DashboardGarzonService implements DashboardGarzonUseCase {
  constructor(
    @Inject(DASHBOARD_GARZON_REPOSITORY)
    private readonly dashboardRepository: DashboardGarzonRepository,
  ) {}

  private validateSession(session: AuthSession): void {
    if (!session || !session.cookies || !session.xsrfToken) {
      throw new BadRequestException(
        'Se requiere una sesión autenticada válida',
      );
    }
  }

  private validateParams(params: DashboardQueryParams): void {
    if (params.stid === undefined || params.stid === null) {
      throw new BadRequestException('El parámetro stid es requerido');
    }
  }

  async getVentasPorTienda(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<VentasPorTienda[]> {
    this.validateSession(session);
    this.validateParams(params);
    return this.dashboardRepository.getVentasPorTienda(session, params);
  }

  async getTopClientes(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<TopCliente[]> {
    this.validateSession(session);
    this.validateParams(params);
    return this.dashboardRepository.getTopClientes(session, params);
  }

  async getTopPagos(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<TopPago[]> {
    this.validateSession(session);
    this.validateParams(params);
    return this.dashboardRepository.getTopPagos(session, params);
  }

  async getTopProductos(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<TopProducto[]> {
    this.validateSession(session);
    this.validateParams(params);
    return this.dashboardRepository.getTopProductos(session, params);
  }

  async getVentasPorDepartamento(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<VentasPorDepartamento[]> {
    this.validateSession(session);
    this.validateParams(params);
    return this.dashboardRepository.getVentasPorDepartamento(session, params);
  }

  async getAllDashboardData(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<DashboardData> {
    this.validateSession(session);
    this.validateParams(params);
    return this.dashboardRepository.getAllDashboardData(session, params);
  }
}

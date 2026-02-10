import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AuthSession } from 'src/context/garzon/domain/entities/auth.entity';
import {
  DashboardData,
  DashboardQueryParams,
  TopCliente,
  TopPago,
  TopProducto,
  VentasPorDepartamento,
  VentasPorTienda,
} from 'src/context/garzon/domain/entities/dashboard.entity';
import { DashboardGarzonRepository } from 'src/context/garzon/domain/ports/out/dashboard-garzon.repository';

/**
 * Adaptador de infraestructura para obtener datos del Dashboard desde el sistema Garzon (Laravel).
 * Implementa el puerto DashboardGarzonRepository para acceder a los endpoints del dashboard.
 */
@Injectable()
export class LaravelDashboardAdapter implements DashboardGarzonRepository {
  private readonly baseUrl = 'http://45.189.38.14:8881';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Construye los headers necesarios para las peticiones autenticadas
   */
  private buildHeaders(session: AuthSession): Record<string, string> {
    return {
      Cookie: session.cookies,
      'X-XSRF-TOKEN': session.xsrfToken,
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: this.baseUrl,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
  }

  /**
   * Realiza una petición GET autenticada al sistema legado
   */
  private async fetchData<T>(
    session: AuthSession,
    endpoint: string,
    params: DashboardQueryParams,
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}?stid=${params.stid}`;
      console.log(`[LaravelDashboardAdapter] Fetching: ${url}`);

      const response = await lastValueFrom(
        this.httpService.get<T>(url, {
          headers: this.buildHeaders(session),
        }),
      );

      console.log(
        `[LaravelDashboardAdapter] Response status: ${response.status}`,
      );
      return response.data;
    } catch (error: any) {
      console.error(
        `[LaravelDashboardAdapter] Error fetching ${endpoint}:`,
        error?.message || error,
      );
      if (error?.response?.status === 401) {
        throw new UnauthorizedException('La sesión ha expirado');
      }
      throw new UnauthorizedException('Error obteniendo datos del dashboard');
    }
  }

  async getVentasPorTienda(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<VentasPorTienda[]> {
    return this.fetchData<VentasPorTienda[]>(
      session,
      '/dashboard/getVtasXTienda',
      params,
    );
  }

  async getTopClientes(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<TopCliente[]> {
    return this.fetchData<TopCliente[]>(
      session,
      '/dashboard/getTopXCliente',
      params,
    );
  }

  async getTopPagos(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<TopPago[]> {
    return this.fetchData<TopPago[]>(
      session,
      '/dashboard/getTopXPagos',
      params,
    );
  }

  async getTopProductos(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<TopProducto[]> {
    return this.fetchData<TopProducto[]>(
      session,
      '/dashboard/getTopXProductos',
      params,
    );
  }

  async getVentasPorDepartamento(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<VentasPorDepartamento[]> {
    return this.fetchData<VentasPorDepartamento[]>(
      session,
      '/dashboard/getVtasXDptos',
      params,
    );
  }

  async getAllDashboardData(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<DashboardData> {
    console.log('[LaravelDashboardAdapter] Fetching all dashboard data...');

    // Ejecutar todas las peticiones en paralelo para mejor rendimiento
    const [
      ventasPorTienda,
      topClientes,
      topPagos,
      topProductos,
      ventasPorDepartamento,
    ] = await Promise.all([
      this.getVentasPorTienda(session, params),
      this.getTopClientes(session, params),
      this.getTopPagos(session, params),
      this.getTopProductos(session, params),
      this.getVentasPorDepartamento(session, params),
    ]);

    return {
      ventasPorTienda,
      topClientes,
      topPagos,
      topProductos,
      ventasPorDepartamento,
    };
  }
}

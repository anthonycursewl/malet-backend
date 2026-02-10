import { AuthSession } from '../../entities/auth.entity';
import {
  DashboardData,
  DashboardQueryParams,
  TopCliente,
  TopPago,
  TopProducto,
  VentasPorDepartamento,
  VentasPorTienda,
} from '../../entities/dashboard.entity';

export const DASHBOARD_GARZON_USE_CASE = 'DASHBOARD_GARZON_USE_CASE';

/**
 * Puerto de entrada para el caso de uso del Dashboard de Garzon.
 * Define el contrato para obtener datos del dashboard.
 */
export interface DashboardGarzonUseCase {
  /**
   * Obtiene las ventas por tienda
   */
  getVentasPorTienda(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<VentasPorTienda[]>;

  /**
   * Obtiene el top de clientes
   */
  getTopClientes(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<TopCliente[]>;

  /**
   * Obtiene el top de pagos
   */
  getTopPagos(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<TopPago[]>;

  /**
   * Obtiene el top de productos
   */
  getTopProductos(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<TopProducto[]>;

  /**
   * Obtiene las ventas por departamento
   */
  getVentasPorDepartamento(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<VentasPorDepartamento[]>;

  /**
   * Obtiene todos los datos del dashboard de forma consolidada
   */
  getAllDashboardData(
    session: AuthSession,
    params: DashboardQueryParams,
  ): Promise<DashboardData>;
}

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

export const DASHBOARD_GARZON_REPOSITORY = 'DASHBOARD_GARZON_REPOSITORY';

/**
 * Puerto de salida para el repositorio del Dashboard de Garzon.
 * Define el contrato para obtener los datos del dashboard desde el sistema legado.
 */
export abstract class DashboardGarzonRepository {
    /**
     * Obtiene las ventas por tienda
     */
    abstract getVentasPorTienda(
        session: AuthSession,
        params: DashboardQueryParams,
    ): Promise<VentasPorTienda[]>;

    /**
     * Obtiene el top de clientes
     */
    abstract getTopClientes(
        session: AuthSession,
        params: DashboardQueryParams,
    ): Promise<TopCliente[]>;

    /**
     * Obtiene el top de pagos
     */
    abstract getTopPagos(
        session: AuthSession,
        params: DashboardQueryParams,
    ): Promise<TopPago[]>;

    /**
     * Obtiene el top de productos
     */
    abstract getTopProductos(
        session: AuthSession,
        params: DashboardQueryParams,
    ): Promise<TopProducto[]>;

    /**
     * Obtiene las ventas por departamento
     */
    abstract getVentasPorDepartamento(
        session: AuthSession,
        params: DashboardQueryParams,
    ): Promise<VentasPorDepartamento[]>;

    /**
     * Obtiene todos los datos del dashboard de forma consolidada
     */
    abstract getAllDashboardData(
        session: AuthSession,
        params: DashboardQueryParams,
    ): Promise<DashboardData>;
}

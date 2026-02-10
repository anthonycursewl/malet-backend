/**
 * Entidades del Dashboard para el sistema Garzon.
 * Representan los datos obtenidos de los diferentes endpoints del dashboard.
 */

/**
 * Ventas por tienda
 */
export interface VentasPorTienda {
  stid: number;
  nombreTienda?: string;
  total?: number;
  [key: string]: any;
}

/**
 * Top clientes
 */
export interface TopCliente {
  clienteId?: number;
  nombre?: string;
  totalCompras?: number;
  [key: string]: any;
}

/**
 * Top pagos
 */
export interface TopPago {
  metodoPago?: string;
  total?: number;
  [key: string]: any;
}

/**
 * Top productos
 */
export interface TopProducto {
  productoId?: number;
  nombre?: string;
  cantidadVendida?: number;
  [key: string]: any;
}

/**
 * Ventas por departamento
 */
export interface VentasPorDepartamento {
  departamentoId?: number;
  nombre?: string;
  total?: number;
  [key: string]: any;
}

/**
 * Respuesta consolidada del dashboard
 */
export interface DashboardData {
  ventasPorTienda: VentasPorTienda[];
  topClientes: TopCliente[];
  topPagos: TopPago[];
  topProductos: TopProducto[];
  ventasPorDepartamento: VentasPorDepartamento[];
}

/**
 * Parámetros de consulta para las peticiones del dashboard
 */
export interface DashboardQueryParams {
  stid: number;
}

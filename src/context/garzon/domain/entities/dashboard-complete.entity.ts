import { AuthSession } from './auth.entity';
import { DashboardData } from './dashboard.entity';

/**
 * Respuesta completa que incluye la sesión autenticada y todos los datos del dashboard.
 * Se usa cuando se quiere hacer login + obtener dashboard en una sola llamada.
 */
export interface DashboardCompleteResponse {
  /** Datos de la sesión autenticada */
  session: AuthSession;

  /** Datos del usuario autenticado (viene del login) */
  user: any;

  /** Todos los datos del dashboard */
  dashboard: DashboardData;

  /** Timestamp de cuando se obtuvieron los datos */
  fetchedAt: string;
}

/**
 * Request para obtener dashboard completo con autenticación
 */
export interface DashboardCompleteRequest {
  /** Credenciales del usuario */
  username: string;
  password: string;

  /** ID de la tienda (0 para todas) */
  stid: number;
}

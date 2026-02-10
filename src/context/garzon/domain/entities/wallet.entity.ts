/**
 * Entidades para el sistema de Wallets de SuperGarzon
 */

/**
 * Información de una wallet individual del cliente
 */
export interface ClientWallet {
  /** Número de identificación del cliente (ej: "V30853507") */
  id_number: string;

  /** Nombre del cliente */
  name: string;

  /** Número de teléfono móvil */
  mobile: string;

  /** Correo electrónico */
  email: string;

  /** ID único de la wallet */
  wallet_id: number;

  /** ID de la moneda */
  moneda: number;

  /** Monto/Saldo actual de la wallet */
  monto: number;

  /** Fecha de última actualización */
  updated_at: string;

  /** Token de verificación (puede ser null) */
  token: string | null;

  /** Fecha del token (puede ser null) */
  date_token: string | null;

  /** ID del cliente */
  client_id: number;

  /** Descripción de la moneda (ej: "DOLARES", "PESOS", "TRANSFERENCIA") */
  descripcion: string;

  /** Código ISO de la moneda (ej: "USD", "COP", "BS") */
  iso: string;

  /** Token para recordar sesión */
  remember_token: string;

  /** Estado de la wallet (1 = activo) */
  status: number;

  /** Monto pendiente */
  pending: number;
}

/**
 * Respuesta de la API de wallets
 */
export interface ClientWalletApiResponse {
  code: number;
  status: string;
  data: ClientWallet[];
}

/**
 * Respuesta formateada del servicio de wallets
 */
export interface ClientWalletResponse {
  /** Información básica del cliente */
  client: {
    id: number;
    idNumber: string;
    name: string;
    mobile: string;
    email: string;
  };

  /** Lista de wallets del cliente */
  wallets: WalletInfo[];

  /** Resumen de saldos */
  summary: WalletSummary;
}

/**
 * Información simplificada de una wallet
 */
export interface WalletInfo {
  walletId: number;
  /** ID de la moneda (usado para transacciones) */
  moneda: number;
  currency: string;
  currencyCode: string;
  balance: number;
  pending: number;
  available: number;
  lastUpdate: string;
  status: 'active' | 'inactive';
  hasToken: boolean;
}

/**
 * Resumen de todas las wallets
 */
export interface WalletSummary {
  totalWallets: number;
  activeWallets: number;
  currencies: string[];
}

/**
 * Parámetros para consultar wallets
 * Acepta tanto el ID numérico del cliente como su número de identificación (cédula)
 */
export interface GetWalletParams {
  /**
   * Identificador del cliente. Puede ser:
   * - ID numérico: "2260"
   * - Número de identificación: "V30853507"
   */
  identifier: string;
}

// ============================================
// INTERFACES PARA GENERACIÓN DE TOKEN
// ============================================

/**
 * Información de una wallet para solicitar token
 */
export interface WalletTokenRequest {
  /** ID de la wallet */
  id: number;

  /** ID de la moneda */
  moneda: number;

  /** ID del cliente */
  client_id: number;
}

/**
 * Body para la petición de generación de token
 */
export interface GenerateWalletTokenParams {
  wallets: WalletTokenRequest[];
}

/**
 * Respuesta de la API al generar token
 */
export interface WalletTokenApiResponse {
  code: number;
  status: string;
  data: any;
  message?: string;
}

/**
 * Respuesta formateada de generación de token
 */
export interface WalletTokenResponse {
  success: boolean;
  message: string;
  data: any;
  requestedWallets: number;
}

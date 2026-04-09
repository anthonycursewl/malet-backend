export function logTagError(action: string, error: any) {
  const message =
    error && typeof error === 'object' ? error.message : String(error);
  // Colores ANSI para consola (frontend-friendly). Label en rojo claro, mensaje en rosa.
  const label = '\x1b[91m[TAG-ERROR-SYSTEM]\x1b[0m'; // rojo claro
  const pink = '\x1b[35m'; // rosa
  const reset = '\x1b[0m';

  console.error(`${label} ${pink}${action}: ${message}${reset}`);
  if (error && error.stack) {
    console.error(pink + error.stack + reset);
  }
}

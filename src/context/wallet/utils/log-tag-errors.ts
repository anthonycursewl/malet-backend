import { Logger } from '@nestjs/common';

const logger = new Logger('TagError');

export function logTagError(action: string, error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  logger.error(
    `${action}: ${message}`,
    error instanceof Error ? error.stack : undefined,
  );
}

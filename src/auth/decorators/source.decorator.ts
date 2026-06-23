import { SetMetadata } from '@nestjs/common';

export const SOURCE_KEY = 'source';

export const Source = (...sources: string[]) =>
  SetMetadata(SOURCE_KEY, sources);

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FILE_STORAGE_PORT } from './file-storage.port';
import { S3FileStorageAdapter } from './s3-file-storage.adapter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FILE_STORAGE_PORT,
      useClass: S3FileStorageAdapter,
    },
  ],
  exports: [FILE_STORAGE_PORT],
})
export class FileStorageModule {}

import { Module } from '@nestjs/common';
import { IMAGE_PROCESSOR_PORT } from './image-processor.port';
import { SharpImageProcessorAdapter } from './sharp-image-processor.adapter';

@Module({
  providers: [
    {
      provide: IMAGE_PROCESSOR_PORT,
      useClass: SharpImageProcessorAdapter,
    },
  ],
  exports: [IMAGE_PROCESSOR_PORT],
})
export class ImageProcessingModule {}

import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { ImageProcessorPort, ProcessedImage } from './image-processor.port';

@Injectable()
export class SharpImageProcessorAdapter implements ImageProcessorPort {
  async resize(
    file: { buffer: Buffer; originalname: string },
    maxWidth: number,
    quality = 82,
  ): Promise<ProcessedImage> {
    const buffer = await sharp(file.buffer)
      // Respeta la orientación de la cámara (EXIF) antes de redimensionar.
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    const baseName = file.originalname.replace(/\.[^.]+$/, '') || 'image';

    return {
      buffer,
      fileName: `${baseName}_${maxWidth}.jpg`,
      mimeType: 'image/jpeg',
    };
  }
}

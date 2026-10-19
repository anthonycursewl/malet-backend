export const IMAGE_PROCESSOR_PORT = 'IMAGE_PROCESSOR_PORT';

export interface ProcessedImage {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

export interface ImageProcessorPort {
  /**
   * Redimensiona una imagen a un ancho máximo (nunca la agranda), respeta la
   * orientación EXIF y devuelve un JPEG optimizado sin metadatos.
   */
  resize(
    file: { buffer: Buffer; originalname: string },
    maxWidth: number,
    quality?: number,
  ): Promise<ProcessedImage>;
}

import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { FileStoragePort, UploadFileParams } from './file-storage.port';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3FileStorageAdapter implements FileStoragePort {
    private s3Client: S3Client;
    private bucketName: string;
    private region: string;
    private endpoint: string | undefined;
    private publicUrl: string | undefined;
    private readonly logger = new Logger(S3FileStorageAdapter.name);

    constructor(private configService: ConfigService) {
        this.region = this.configService.get<string>('AWS_REGION') || 'auto';
        this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
        this.endpoint = this.configService.get<string>('AWS_ENDPOINT');
        this.publicUrl = this.configService.get<string>('AWS_PUBLIC_URL');

        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

        if (!accessKeyId || !secretAccessKey) {
            this.logger.warn('⚠️ AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is missing in environment variables.');
        }

        this.s3Client = new S3Client({
            region: this.region,
            endpoint: this.endpoint,
            credentials: {
                accessKeyId: accessKeyId || '',
                secretAccessKey: secretAccessKey || '',
            },
        });
    }

    async uploadFile(params: UploadFileParams): Promise<string> {
        const { file, fileName, mimeType, folder = 'uploads' } = params;

        // Generar nombre único para el archivo
        const fileExtension = fileName.split('.').pop();
        const uniqueFileName = `${folder}/${uuidv4()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: uniqueFileName,
            Body: file,
            ContentType: mimeType,
            // ACL: 'public-read', // Comentado: R2 no siempre soporta ACLs de la misma forma que AWS. Habilitar si es necesario.
        });

        await this.s3Client.send(command);

        // Retornar la URL pública del archivo
        if (this.publicUrl) {
            // Asegurar que no haya doble slash
            const baseUrl = this.publicUrl.endsWith('/') ? this.publicUrl.slice(0, -1) : this.publicUrl;
            return `${baseUrl}/${uniqueFileName}`;
        }

        // Fallback para AWS S3 estándar
        return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${uniqueFileName}`;
    }

    async deleteFile(fileUrl: string): Promise<void> {
        if (!fileUrl) return;

        try {
            // Intentar extraer la key.
            // Si usamos custom domain: https://cdn.misitio.com/uploads/archivo.jpg -> key: uploads/archivo.jpg
            let key = '';

            if (this.publicUrl && fileUrl.startsWith(this.publicUrl)) {
                key = fileUrl.replace(this.publicUrl, '');
                if (key.startsWith('/')) key = key.substring(1);
            } else {
                // Fallback simple
                const url = new URL(fileUrl);
                key = url.pathname.substring(1);
            }

            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
        } catch (error) {
            console.error('Error deleting file from S3:', error);
            // No lanzar error para no interrumpir el flujo si el archivo no existe
        }
    }
}

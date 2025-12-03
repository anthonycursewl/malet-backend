export const FILE_STORAGE_PORT = 'FILE_STORAGE_PORT';

export interface UploadFileParams {
    file: Buffer;
    fileName: string;
    mimeType: string;
    folder?: string;
}

export interface FileStoragePort {
    uploadFile(params: UploadFileParams): Promise<string>;
    deleteFile(fileUrl: string): Promise<void>;
}

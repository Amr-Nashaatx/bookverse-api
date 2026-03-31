export abstract class StorageProvider {
  abstract uploadImage(buffer: Buffer, folder: string): Promise<any>;

  abstract deleteImage(publicId: string): Promise<any>;
}

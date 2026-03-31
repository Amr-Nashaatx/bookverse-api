import { StorageProvider } from "./StorageProvider";
import cloudinary from "../../config/cloudinary.js";
import { Readable } from "stream";

export class CloudinaryProvider extends StorageProvider {
  uploadImage(buffer: Buffer, folder: string): Promise<any> {
    if (!buffer) {
      throw new Error("File buffer is required");
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [{ width: 600, height: 900, crop: "fill" }],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string) {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  }
}

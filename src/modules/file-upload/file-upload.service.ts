import { Inject, Injectable } from '@nestjs/common';
import * as streamifier from 'streamifier';

@Injectable()
export class FileUploadService {
  constructor(
    @Inject('CLOUDINARY')
    private readonly cloudinary: any,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'profiles',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}

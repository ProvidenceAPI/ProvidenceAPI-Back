import { Module } from '@nestjs/common';
import { CloudinaryProvider } from 'src/config/cloudinary';
import { FileUploadService } from './file-upload.service';

@Module({
  providers: [CloudinaryProvider, FileUploadService],
  exports: [FileUploadService],
})
export class FileUploadModule {}

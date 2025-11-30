import { cloudinary } from "@/config/cloudinary.config";
import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
// import { v2 as cloudinary } from "cloudinary";

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary once when service is instantiated
    //   cloudinary.config({
    //     cloud_name: this.configService.get<string>("CLOUDINARY_CLOUD_NAME"),
    //     api_key: this.configService.get<string>("CLOUDINARY_API_KEY"),
    //     api_secret: this.configService.get<string>("CLOUDINARY_API_SECRET"),
    //     secure_distribution: this.configService.get<string>(
    //       "CLOUDINARY_SECURE_DISTRIBUTION"
    //     ),
    //     upload_prefix: this.configService.get<string>("CLOUDINARY_UPLOAD_PREFIX"),
    //   });
  }

  // Now you can use cloudinary.uploader directly
  async uploadImage(uploadFileDto: UploadFileDto) {
    try {
      const { file, imagePath } = uploadFileDto;
      const result = await cloudinary.uploader.upload(file, {
        asset_folder: "streamline-suite",
        public_id_prefix: imagePath,
      });
      return result;
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  async uploadBuffer(buffer: Buffer, options?: any) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(options, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        })
        .end(buffer);
    });
  }

  async deleteImage(publicId: string) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new Error(`Cloudinary delete failed: ${error.message}`);
    }
  }

  // Get cloudinary instance for direct usage
  getCloudinary() {
    return cloudinary;
  }
}

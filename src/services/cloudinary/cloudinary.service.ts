import { cloudinary } from "@/config/cloudinary.config";
import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    // Configure Cloudinary when service is instantiated
    const cloudinaryUrl = this.configService.get<string>("CLOUDINARY_URL");

    if (cloudinaryUrl) {
      cloudinary.config(cloudinaryUrl);
      this.logger.log("Cloudinary configured using CLOUDINARY_URL");
    } else {
      const cloudName = this.configService.get<string>("CLOUDINARY_CLOUD_NAME");
      const apiKey = this.configService.get<string>("CLOUDINARY_API_KEY");
      const apiSecret = this.configService.get<string>("CLOUDINARY_API_SECRET");

      this.logger.log(
        `Cloudinary Config - Cloud: ${cloudName ? "✓" : "✗"}, Key: ${apiKey ? "✓" : "✗"}, Secret: ${apiSecret ? "✓" : "✗"}`,
      );

      if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        });
        this.logger.log("Cloudinary configured successfully");
      } else {
        this.logger.warn("Cloudinary credentials missing - uploads will fail");
      }
    }
  }

  // Now you can use cloudinary.uploader directly
  async uploadImage(uploadFileDto: UploadFileDto) {
    try {
      // Debug: Check config at upload time
      const config = cloudinary.config();
      this.logger.log(
        `Upload attempt - Config state: cloud_name=${config.cloud_name}, api_key=${config.api_key ? "set" : "missing"}`,
      );

      if (!config.api_key) {
        // Re-configure if missing
        const cloudName = this.configService.get<string>(
          "CLOUDINARY_CLOUD_NAME",
        );
        const apiKey = this.configService.get<string>("CLOUDINARY_API_KEY");
        const apiSecret = this.configService.get<string>(
          "CLOUDINARY_API_SECRET",
        );

        this.logger.log(
          `Re-configuring - ENV values: cloud=${cloudName}, key=${apiKey ? "exists" : "missing"}, secret=${apiSecret ? "exists" : "missing"}`,
        );

        if (cloudName && apiKey && apiSecret) {
          cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
          });
        }
      }

      const { file, imagePath } = uploadFileDto;
      const result = await cloudinary.uploader.upload(file, {
        asset_folder: "streamline-suite",
        public_id_prefix: imagePath,
      });
      return result;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Cloudinary upload failed: ${err.message}`);
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
      const err = error as Error;
      throw new Error(`Cloudinary delete failed: ${err.message}`);
    }
  }

  // Get cloudinary instance for direct usage
  // getCloudinary() {
  //   return cloudinary;
  // }
}

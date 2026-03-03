import { v2 as cloudinary } from "cloudinary";
import { ConfigService } from "@nestjs/config";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class CloudinaryConfigService {
  private readonly logger = new Logger(CloudinaryConfigService.name);

  constructor(private configService: ConfigService) {
    this.configure();
  }

  private configure() {
    try {
      const cloudinaryUrl = this.configService.get<string>("CLOUDINARY_URL");
              this.logger.log("Cloudinary Config Check:");
        this.logger.log("Cloudinary Config Check:", cloudinaryUrl);


      if (cloudinaryUrl) {
        // If CLOUDINARY_URL is provided, use it directly
        cloudinary.config(cloudinaryUrl);
        this.logger.log("Cloudinary configured using CLOUDINARY_URL");
      } else {
        // Otherwise, use individual environment variables
        const cloudName = this.configService.get<string>(
          "CLOUDINARY_CLOUD_NAME",
        );
        const apiKey = this.configService.get<string>("CLOUDINARY_API_KEY");
        const apiSecret = this.configService.get<string>(
          "CLOUDINARY_API_SECRET",
        );

        // Debug logging to identify missing credentials
        this.logger.log("Cloudinary Config Check:");
        this.logger.log(`  Cloud Name: ${cloudName ? "✓ Set" : "✗ Missing"}`);
        this.logger.log(`  API Key: ${apiKey ? "✓ Set" : "✗ Missing"}`);
        this.logger.log(`  API Secret: ${apiSecret ? "✓ Set" : "✗ Missing"}`);

        if (!cloudName || !apiKey || !apiSecret) {
          this.logger.warn(
            "Cloudinary configuration incomplete. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables, or provide CLOUDINARY_URL.",
          );
          return;
        }

        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure_distribution: this.configService.get<string>(
            "CLOUDINARY_SECURE_DISTRIBUTION",
          ),
          upload_prefix: this.configService.get<string>(
            "CLOUDINARY_UPLOAD_PREFIX",
          ),
        });

        this.logger.log(
          "Cloudinary configured using individual environment variables",
        );
      }
    } catch (error) {
      this.logger.error("Failed to configure Cloudinary:", error);
      this.logger.warn("Cloudinary features will be disabled");
    }
  }

  getCloudinaryInstance() {
    return cloudinary;
  }

  isConfigured(): boolean {
    try {
      const config = cloudinary.config();
      return !!(config.cloud_name && config.api_key && config.api_secret);
    } catch (error) {
      return false;
    }
  }
}

export const configureCloudinary = (configService: ConfigService) => {
  const service = new CloudinaryConfigService(configService);
  return service.getCloudinaryInstance();
};

// Export configured cloudinary instance
export { cloudinary };

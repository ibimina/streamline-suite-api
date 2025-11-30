import { v2 as cloudinary } from "cloudinary";
import { ConfigService } from "@nestjs/config";

export const configureCloudinary = (configService: ConfigService) => {
  cloudinary.config({
    cloud_name: configService.get<string>("CLOUDINARY_CLOUD_NAME"),
    api_key: configService.get<string>("CLOUDINARY_API_KEY"),
    api_secret: configService.get<string>("CLOUDINARY_API_SECRET"),
    secure_distribution: configService.get<string>(
      "CLOUDINARY_SECURE_DISTRIBUTION"
    ),
    upload_prefix: configService.get<string>("CLOUDINARY_UPLOAD_PREFIX"),
  });

  return cloudinary;
};

// Export configured cloudinary instance
export { cloudinary };

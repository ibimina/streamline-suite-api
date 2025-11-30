import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import * as path from "path";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { configureCloudinary } from "./config/cloudinary.config";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Configure Cloudinary globally
  configureCloudinary(configService);

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.enableCors({
    origin: configService.get("FRONTEND_URL") || "http://localhost:3000",
    credentials: true,
  });

  // Serve static files
  const uploadPath = configService.get("UPLOAD_PATH") || "uploads";
  app.useStaticAssets(path.join(process.cwd(), uploadPath), {
    prefix: "/uploads",
    setHeaders: (res) => {
      res.set({
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "public, max-age=86400", // 24 hours
      });
    },
  });

  // Global prefix
  app.setGlobalPrefix("api/v1");

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Streamline Suite API")
    .setDescription(
      "NestJS backend API for Streamline Suite business management system"
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth"
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = configService.get("PORT") || 3001;
  await app.listen(port);
  console.log(`🚀 Application running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`📁 Static Files: http://localhost:${port}/uploads`);
}

bootstrap();

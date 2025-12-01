import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';

// Import modules
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from './controllers/auth/auth.controller';
import { CompaniesController } from './controllers/companies/companies.controller';
import { EmailController } from './controllers/email/email.controller';
import { InvoicesController } from './controllers/invoices/invoices.controller';
import { QuotationsController } from './controllers/quotations/quotations.controller';
import { UserController } from './controllers/user/user.controller';
import { AuthService } from './services/auth/auth.service';
import { CompaniesService } from './services/company/companies.service';
import { EmailService } from './services/email/email.service';
import { InvoicesService } from './services/invoice/invoices.service';
import { QuotationsService } from './services/quotation/quotations.service';
import { UserService } from './services/user/user.service';
import { UserSchema } from './schemas/user.schema';
import { CompanySchema } from './schemas/company.schema';
import { InvoiceSchema } from './schemas/invoice.schema';
import { TokenFreeBlacklistService } from './services/token/token-free-blacklist.service';
import { QuotationSchema } from './schemas/quotation.schema';
import { CustomerSchema } from './schemas/customer.schema';
import { CloudinaryService } from './services/cloudinary/cloudinary.service';
import { TemplateSchema } from './schemas/template.schema';
import { TemplateController } from './controllers/templates/template.controller';
import { TemplateService } from './services/templates/template.service';

@Module({
  
  imports: [
     JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>("JWT_SECRET") || "your-secret-key",
            signOptions: {
              expiresIn: configService.get<string>("JWT_EXPIRES_IN") || "15m",
            },
          }),
          inject: [ConfigService],
        }),
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
    //schema
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Company', schema: CompanySchema },
      { name: 'Invoice', schema: InvoiceSchema },
      { name: 'Quotation', schema: QuotationSchema },
      { name: 'Customer', schema: CustomerSchema },
            { name: 'Template', schema: TemplateSchema },
        ]),
    // Rate limiting
  ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
  }),
  ],
  controllers: [
    AuthController,
    CompaniesController,
    EmailController,
    InvoicesController,
    QuotationsController,
    UserController,
    TemplateController,

  ],
  providers: [
    AuthService,
    CompaniesService,
    EmailService,
    InvoicesService,
    QuotationsService,
    UserService,
    TokenFreeBlacklistService,
    CloudinaryService,
    TemplateService,
  ],
})
export class AppModule {}
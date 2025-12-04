import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";

// Import modules
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./controllers/auth/auth.controller";
import { EmailController } from "./controllers/email/email.controller";
import { UserController } from "./controllers/user/user.controller";
import { AuthService } from "./services/auth/auth.service";
import { AccountService } from "./services/account/account.service";
import { EmailService } from "./services/email/email.service";
import { InvoicesService } from "./services/invoice/invoices.service";
import { QuotationsService } from "./services/quotation/quotations.service";
import { UserService } from "./services/user/user.service";
import { UserSchema } from "./schemas/user.schema";
import { AccountSchema } from "./schemas/account.schema";
import { InvoiceSchema } from "./schemas/invoice.schema";
import { TokenFreeBlacklistService } from "./services/token/token-free-blacklist.service";
import { QuotationSchema } from "./schemas/quotation.schema";
import { CustomerSchema } from "./schemas/customer.schema";
import { CloudinaryService } from "./services/cloudinary/cloudinary.service";
import { TemplateSchema } from "./schemas/template.schema";
import { TemplateController } from "./controllers/templates/template.controller";
import { TemplateService } from "./services/templates/template.service";
import { ProductController } from "./controllers/products/product.controller";
import { ProductService } from "./services/product/product.service";
import { ProductSchema } from "./schemas/product.schema";
import { InventoryTransactionSchema } from "./schemas/inventory-transaction.schema";
import { SupplierController } from "./controllers/supplier/supplier.controller";
import { InventoryTransactionController } from "./controllers/inventory-transaction/inventory-transaction.controller";
import { SupplierService } from "./services/supplier/supplier.service";
import { InventoryTransactionService } from "./services/inventory-transaction/inventory-transaction.service";
import { SupplierSchema } from "./schemas/supplier.schema";
import { ActivitySchema } from "./schemas/activity.schema";
import { ActivityService } from "./services/activity/activity.service";
import { CustomerPortalController } from "./controllers/customer-portal/customer-portal.controller";
import { CustomerService } from "./services/customer/customer.service";

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
      envFilePath: [".env.local", ".env"],
    }),

    // Database connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("DATABASE_URL"),
      }),
      inject: [ConfigService],
    }),
    //schema
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "Account", schema: AccountSchema },
      { name: "Invoice", schema: InvoiceSchema },
      { name: "Quotation", schema: QuotationSchema },
      { name: "Customer", schema: CustomerSchema },
      { name: "Template", schema: TemplateSchema },
      { name: "Product", schema: ProductSchema },
      { name: "InventoryTransaction", schema: InventoryTransactionSchema },
      { name: "Supplier", schema: SupplierSchema },
      { name: "Activity", schema: ActivitySchema },
    ]),
    // Rate limiting
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
  ],
  controllers: [
    AuthController,
    EmailController,
    UserController,
    TemplateController,
    ProductController,
    InventoryTransactionController,
    SupplierController,
    CustomerPortalController,
  ],
  providers: [
    AuthService,
    AccountService,
    EmailService,
    InvoicesService,
    QuotationsService,
    UserService,
    TokenFreeBlacklistService,
    CloudinaryService,
    TemplateService,
    ProductService,
    InventoryTransactionService,
    SupplierService,
    ActivityService,
    CustomerService,
  ],
})
export class AppModule {}

import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsMongoId,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateProductDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(["product", "service", "consumable", "digital"])
  type?: string;

  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @IsOptional()
  @IsBoolean()
  trackSerialNumber?: boolean;

  @ApiPropertyOptional({
    description: "Whether to track expiry dates for this product",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  trackExpiryDate?: boolean;

  @ApiPropertyOptional({
    description: "Product expiry date (ISO date string)",
    example: "2024-12-31",
  })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: "Cost price of the product",
    example: 10.99,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockAlert?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStock?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    description: "Primary supplier ID",
    example: "507f1f77bcf86cd799439011",
  })
  @IsOptional()
  @IsMongoId()
  supplier?: string;

  @ApiPropertyOptional({
    description: "Alternative supplier IDs",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  alternativeSuppliers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  salesTaxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  purchaseTaxRate?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

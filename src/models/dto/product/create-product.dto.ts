import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  Max,
} from "class-validator";

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

  @IsOptional()
  @IsBoolean()
  trackExpiryDate?: boolean;

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
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

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

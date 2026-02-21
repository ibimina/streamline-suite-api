import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  IsEnum,
  ArrayMinSize,
  IsMongoId,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";
import { QuotationStatus } from "@/common/types";

export class ItemDto {
  @IsOptional()
  @IsString()
  product?: string; // Product ObjectId reference

  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate: number; // Required VAT rate per item

  @IsNumber()
  @Min(0)
  unitCost: number; // Required for profit calculation
}

export class CreateQuotationDto {
  @IsMongoId()
  @IsNotEmpty()
  customer: string; // Customer ObjectId reference (required)

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];

  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @IsOptional()
  @IsDateString()
  validUntil?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  whtRate?: number; // Withholding tax rate

  @IsDateString()
  issuedDate: Date; // Required issued date
}

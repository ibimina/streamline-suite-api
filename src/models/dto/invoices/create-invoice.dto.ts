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
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { InvoiceStatus } from "@/common/types";

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

  @IsOptional()
  @IsBoolean()
  subjectToWHT?: boolean; // Whether this item is subject to withholding tax

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  whtRate?: number; // Withholding tax rate for this item

  @IsNumber()
  @Min(0)
  unitCost: number; // Required for profit calculation
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  quotation?: string; // Quotation ObjectId reference

  @IsString()
  customer: string; // Customer ObjectId reference (required)

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

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
}

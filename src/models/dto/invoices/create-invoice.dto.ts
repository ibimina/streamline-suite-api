import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  IsEnum,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { InvoiceStatus, ItemDetails } from "@/common/types";

export class ItemDto implements ItemDetails {
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
  costPrice?: number;
}

export class CreateInvoiceDto {
  @IsDateString()
  issueDate: Date;

  @IsDateString()
  @IsOptional()
  dueDate: Date;

  @IsString()
  clientName: string;

  @IsEmail()
  clientEmail: string;

  @IsString()
  clientAddress: string;

  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

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
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number; // VAT rate percentage (added to customer total)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  whtRate?: number; // Withholding tax rate percentage (deducted from our receivable)

  @IsOptional()
  @IsEnum(["percentage", "fixed"])
  discountType?: "percentage" | "fixed";
}

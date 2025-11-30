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
} from "class-validator";
import { Type } from "class-transformer";
import { QuotationItemDetails } from "@/common/types";

export class ItemDto implements QuotationItemDetails {
  @IsString()
  name: string;

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
  sellingPricePercentage: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice: number;
}

export class CreateQuotationDto {
  @IsDateString()
  issueDate: Date;

  @IsDateString()
  expiryDate: Date;

  @IsString()
  clientName: string;

  @IsOptional()
  @IsEmail()
  clientEmail: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsString()
  clientAddress: string;

  @IsOptional()
  @IsString()
  clientCity?: string;

  @IsOptional()
  @IsString()
  clientState?: string;

  @IsOptional()
  @IsString()
  clientCountry?: string;

  @IsOptional()
  @IsString()
  clientZipCode?: string;

  @IsArray()
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
  customTemplateId?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number; // Default VAT rate for quotation

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  whtRate?: number; // Withholding tax rate
}

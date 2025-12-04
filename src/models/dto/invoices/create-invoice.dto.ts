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
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { InvoiceStatus } from "@/common/types";

export class ItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  product?: string; // Product ObjectId reference

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate: number; // Required VAT rate per item

  @ApiPropertyOptional()
  @IsBoolean()
  subjectToWHT?: boolean; // Whether this item is subject to withholding tax

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  whtRate?: number; // Withholding tax rate for this item

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitCost: number; // Required for profit calculation
}

export class CreateInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quotation?: string; // Quotation ObjectId reference

  @ApiProperty()
  @IsString()
  customer: string; // Customer ObjectId reference (required)

  @ApiProperty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accentColor?: string;
}

import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { InvoiceStatus } from "@/common/types";

export class CreateInvoiceItemDto {
  @ApiPropertyOptional({ description: "Product ID reference" })
  @IsOptional()
  @IsString()
  product?: string;

  @ApiProperty({ description: "Item description" })
  @IsString()
  description: string;

  @ApiProperty({ description: "Quantity", minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: "Unit price", minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    description: "Unit cost for profit calculation",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ description: "Discount percentage", default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ description: "VAT rate percentage", default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: "Customer ID" })
  @IsString()
  customer: string;

  @ApiPropertyOptional({ description: "Quotation ID to link this invoice to" })
  @IsOptional()
  @IsString()
  quotation?: string;

  @ApiProperty({
    description: "Invoice line items",
    type: [CreateInvoiceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @ApiPropertyOptional({
    description: "Invoice status",
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: "Issue date" })
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiPropertyOptional({ description: "Due date" })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: "Purchase Order number" })
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiPropertyOptional({
    description: "Withholding tax rate percentage",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  whtRate?: number;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Terms and conditions" })
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional({ description: "Template name" })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ description: "Accent color" })
  @IsOptional()
  @IsString()
  accentColor?: string;
}

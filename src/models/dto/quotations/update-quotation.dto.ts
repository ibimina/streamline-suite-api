import { PartialType } from "@nestjs/mapped-types";
import {  CreateQuotationDto } from "./create-quotation.dto";
import { IsOptional, IsEnum, IsString } from "class-validator";
import { QuotationStatus } from "@/common/types";

export class UpdateQuotationDto extends PartialType(CreateQuotationDto) {
  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class UpdateInvoiceStatusDto {
  @IsEnum(QuotationStatus)
  status: QuotationStatus;
}

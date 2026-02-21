import { PartialType } from "@nestjs/swagger";
import { CreateInvoiceDto } from "./create-invoice.dto";
import { IsOptional, IsEnum, IsString } from "class-validator";
import { InvoiceStatus } from "@/common/types";

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;
}

import { IsEnum, IsOptional, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { TaxReportStatus } from "@/schemas/tax-report.schema";

export class UpdateTaxReportStatusDto {
  @ApiPropertyOptional({ enum: TaxReportStatus })
  @IsEnum(TaxReportStatus)
  status: TaxReportStatus;
}

export class FileTaxReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  filedDate?: string;
}

export class PayTaxReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidDate?: string;
}

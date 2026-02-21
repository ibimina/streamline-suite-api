import { IsString, IsEnum, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TaxReportType } from "@/schemas/tax-report.schema";

export class CreateTaxReportDto {
  @ApiProperty({ description: "Tax period (e.g., Q1 2024, 2024-01)" })
  @IsString()
  period: string;

  @ApiProperty({ enum: TaxReportType })
  @IsEnum(TaxReportType)
  type: TaxReportType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

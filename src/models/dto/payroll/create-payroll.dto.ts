import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsMongoId,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  PayFrequency,
  DeductionType,
  AllowanceType,
} from "@/schemas/payroll.schema";

export class PayrollDeductionDto {
  @ApiProperty({ enum: DeductionType })
  @IsEnum(DeductionType)
  type: DeductionType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPercentage?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  percentage?: number;
}

export class PayrollAllowanceDto {
  @ApiProperty({ enum: AllowanceType })
  @IsEnum(AllowanceType)
  type: AllowanceType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPercentage?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  percentage?: number;
}

export class PayrollItemDto {
  @ApiProperty({ description: "Staff member ID" })
  @IsMongoId()
  staff: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  basicSalary: number;

  @ApiPropertyOptional({ type: [PayrollAllowanceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollAllowanceDto)
  allowances?: PayrollAllowanceDto[];

  @ApiPropertyOptional({ type: [PayrollDeductionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollDeductionDto)
  deductions?: PayrollDeductionDto[];

  @ApiPropertyOptional({ enum: ["bank_transfer", "cash", "cheque"] })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class CreatePayrollDto {
  @ApiProperty({ description: "Pay period start date" })
  @IsDateString()
  payPeriodStart: string;

  @ApiProperty({ description: "Pay period end date" })
  @IsDateString()
  payPeriodEnd: string;

  @ApiProperty({ description: "Payment date" })
  @IsDateString()
  payDate: string;

  @ApiProperty({ enum: PayFrequency })
  @IsEnum(PayFrequency)
  payFrequency: PayFrequency;

  @ApiProperty({ type: [PayrollItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollItemDto)
  items: PayrollItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

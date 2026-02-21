import { PartialType } from "@nestjs/mapped-types";
import { CreatePayrollDto } from "./create-payroll.dto";
import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PayrollStatus } from "@/schemas/payroll.schema";

export class UpdatePayrollDto extends PartialType(CreatePayrollDto) {}

export class UpdatePayrollStatusDto {
  @ApiProperty({ enum: PayrollStatus })
  @IsEnum(PayrollStatus)
  status: PayrollStatus;
}

import { PartialType } from "@nestjs/mapped-types";
import { CreateExpenseDto } from "./create-expense.dto";
import { IsOptional, IsEnum } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ExpenseStatus } from "@/schemas/expense.schema";

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class UpdateExpenseStatusDto {
  @ApiPropertyOptional({ enum: ExpenseStatus, description: "Expense status" })
  @IsEnum(ExpenseStatus)
  status: ExpenseStatus;
}

import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  Min,
  IsMongoId,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ExpenseCategory,
  PaymentMethod,
  RecurringFrequency,
} from "@/schemas/expense.schema";

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory, description: "Expense category" })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({ description: "Description of the expense" })
  @IsString()
  description: string;

  @ApiProperty({ description: "Expense amount", minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: "Currency code (default: NGN)" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: "Date of the expense" })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: "Vendor/Supplier ID" })
  @IsOptional()
  @IsMongoId()
  vendor?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, description: "Payment method" })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: "Reference number" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: "Receipt URL" })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Tags for categorization" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "Is this a recurring expense?" })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    enum: RecurringFrequency,
    description: "Recurring frequency",
  })
  @IsOptional()
  @IsEnum(RecurringFrequency)
  recurringFrequency?: RecurringFrequency;
}

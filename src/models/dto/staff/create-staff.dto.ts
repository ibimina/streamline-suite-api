import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsBoolean,
  MinLength,
  IsArray,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { RoleName, PermissionName } from "@/models/enums/shared.enum";

/**
 * Employment Type Enum
 */
export enum EmploymentType {
  FULL_TIME = "full-time",
  PART_TIME = "part-time",
  CONTRACT = "contract",
  INTERN = "intern",
}

/**
 * Create Staff Data Transfer Object
 *
 * Used for creating new staff members (users with staff role)
 * Staff are users who belong to a company account
 */
export class CreateStaffDto {
  @ApiProperty({ description: "Staff first name", example: "John" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({ description: "Staff last name", example: "Doe" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({ description: "Staff email address", example: "john.doe@company.com" })
  @IsEmail()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email: string;

  @ApiProperty({ description: "Password (minimum 8 characters)", example: "securePass123!" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: "Staff phone number", example: "+1234567890" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: "Staff role within the organization",
    enum: RoleName,
    example: RoleName.Staff,
  })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @ApiPropertyOptional({
    description: "Job position/title",
    example: "Sales Manager",
  })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({
    description: "Department name",
    example: "Sales",
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: "Employee ID/Number",
    example: "EMP001",
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({
    description: "Monthly salary amount",
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({
    description: "Employment type",
    enum: EmploymentType,
    example: EmploymentType.FULL_TIME,
  })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({
    description: "Date of hire",
    example: "2024-01-15",
  })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({
    description: "Staff address",
    example: "123 Main St, City, Country",
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: "Whether staff is active",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "List of permissions assigned to this staff member",
    type: [String],
    enum: PermissionName,
    example: [PermissionName.VIEW_DASHBOARD, PermissionName.PROCESS_ORDERS],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PermissionName, { each: true })
  permissions?: PermissionName[];
}

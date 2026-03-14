import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsArray,
  IsIn,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@/common/types";
import { PermissionName } from "@/models/enums/shared.enum";

export class CreateUserDto {
  @ApiProperty({ description: "Email address" })
  @IsEmail()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email: string;

  @ApiProperty({ description: "Password (minimum 8 characters)" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: "First name" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({ description: "Last name" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiProperty({ description: "User role" })
  @IsEnum(UserRole)
  role: UserRole = UserRole.STAFF;

  @ApiPropertyOptional({
    description: "Permission mode: inherit from role or use custom permissions",
    enum: ["inherit", "custom"],
  })
  @IsOptional()
  @IsIn(["inherit", "custom"])
  permissionMode?: "inherit" | "custom";

  @ApiPropertyOptional({
    description:
      "Custom permissions (only used when permissionMode is 'custom')",
    type: [String],
    enum: PermissionName,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PermissionName, { each: true })
  permissions?: PermissionName[];
}

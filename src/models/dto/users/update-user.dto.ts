import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsArray,
  IsIn,
  IsBoolean,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@/common/types";
import { PermissionName } from "@/models/enums/shared.enum";

export class UpdateUserDto {
  @ApiProperty({ description: "The user's full name", required: true })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: "The user's role",
    enum: UserRole,
    required: true,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ description: "Is the user active?", required: true })
  @IsBoolean()
  isActive: boolean;

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

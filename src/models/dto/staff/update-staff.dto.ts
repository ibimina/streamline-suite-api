import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateStaffDto } from "./create-staff.dto";
import { IsOptional, IsString, MinLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Update Staff Data Transfer Object
 *
 * All fields from CreateStaffDto are optional except for password
 * which has its own optional field to allow password updates
 */
export class UpdateStaffDto extends PartialType(
  OmitType(CreateStaffDto, ["password", "email"] as const)
) {
  @ApiPropertyOptional({
    description: "New password (minimum 8 characters). Only include if changing password.",
    example: "newSecurePass123!",
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

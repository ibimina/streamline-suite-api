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
export class UpdateStaffDto extends PartialType(CreateStaffDto) {

}

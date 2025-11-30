import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@/common/types";

export class UpdateUserDto {

  @ApiProperty({ description: "The user's full name", required: true })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: "The user's role", enum: UserRole, required: true })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ description: "Is the user active?", required: true })
  isActive: boolean;
}

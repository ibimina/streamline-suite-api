import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@/common/types";

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

  @ApiProperty({ description: "User role" })
  @IsEnum(UserRole)
  role: UserRole = UserRole.STAFF;


}


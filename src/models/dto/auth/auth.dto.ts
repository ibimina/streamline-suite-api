import {
  IsEmail,
  IsString,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCompanyandUserDto {
  @ApiProperty({ description: "Company name" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: "Company description" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ description: "Company address" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  address: string;

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

  @ApiProperty({ description: "Country" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  country: string;

  @ApiProperty({ description: "City" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  city: string;

  @ApiProperty({ description: "zipCode" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  zipCode: string;

  @ApiProperty({ description: "State" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  state: string;
}

export class LoginDto {
  @ApiProperty({ description: "Email address" })
  @IsEmail()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email: string;

  @ApiProperty({ description: "Password" })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: "Refresh token" })
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: "Current password" })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: "New password (minimum 8 characters)" })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

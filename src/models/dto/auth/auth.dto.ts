import { IsEmail, IsString, MinLength } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCompanyandUserDto {
  @ApiProperty({ description: "Account name" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ description: "Account industry" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  industry: string;

  @ApiPropertyOptional({ description: "Account address" })
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

  @ApiProperty({ description: "Phone number with country code" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  phoneNumber: string;

  @ApiProperty({ description: "Company size" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  companySize: string;
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

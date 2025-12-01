import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  IsObject,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCompanyDto {
  @ApiProperty({ description: "Company name" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: "Company description" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({ description: "Company address" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  address: string;

  @ApiPropertyOptional({ description: "City" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({ description: "State" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  state?: string;

  @ApiPropertyOptional({ description: "Country" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  country?: string;

  @ApiPropertyOptional({ description: "ZIP Code" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  zipCode?: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiProperty({ description: "Email address" })
  @IsEmail()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email?: string;

  @ApiPropertyOptional({
    description: "Company settings",
    example: {
      currency: "USD",
    },
  })
  @IsOptional()
  @IsObject()
  settings?: {
    currency?: string;
  };

  @ApiProperty({ description: "First name of the user creating the company" })
  @IsString()
  firstName: string;

  @ApiProperty({ description: "Last name of the user creating the company" })
  @IsString()
  lastName: string;

  @ApiProperty({ description: "Password for the user creating the company" })
  @IsString()
  password: string;
}

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

  @ApiPropertyOptional({ description: "Email address" })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email?: string;

  @ApiPropertyOptional({ description: "Website URL" })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => value?.trim())
  website?: string;

  @ApiPropertyOptional({ description: "Tax number" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  taxNumber?: string;

  @ApiPropertyOptional({ description: "Registration number" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: "Company settings",
    example: {
      currency: "USD",
      timezone: "UTC",
      dateFormat: "YYYY-MM-DD",
      language: "en",
    },
  })
  @IsOptional()
  @IsObject()
  settings?: {
    currency?: string;
    timezone?: string;
    dateFormat?: string;
    language?: string;
  };
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: "Company name" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({ description: "Company description" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ description: "Company address" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  address?: string;

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

  @ApiPropertyOptional({ description: "Email address" })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email?: string;

  @ApiPropertyOptional({ description: "Website URL" })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => value?.trim())
  website?: string;

  @ApiPropertyOptional({ description: "Tax number" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  taxNumber?: string;

  @ApiPropertyOptional({ description: "Registration number" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: "Company settings",
    example: {
      currency: "USD",
      timezone: "UTC",
      dateFormat: "YYYY-MM-DD",
      language: "en",
    },
  })
  @IsOptional()
  @IsObject()
  settings?: {
    currency?: string;
    timezone?: string;
    dateFormat?: string;
    language?: string;
  };
}

export class CreateCustomTemplateDto {
  @ApiProperty({ description: "Template name" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;
}

import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  IsObject,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateAccountDto } from "./create-account.dto";

export class UpdateAccountDto extends CreateAccountDto {
  @ApiPropertyOptional({ description: "Whether the account is active" })
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Account website URL" })
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
    description: "Account settings",
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

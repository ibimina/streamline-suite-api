import {
  IsString,
  IsOptional,
  IsEmail,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class CreateAccountDto {
  @ApiProperty({ description: "Account name" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ description: "Account description" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  industry: string;

  @ApiProperty({ description: "Account address" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  address: string;

  @ApiProperty({ description: "Country" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  country: string;

  @ApiProperty({ description: "Phone number" })
  @IsString()
  @Transform(({ value }) => value?.trim())
  phone: string;

  @ApiProperty({ description: "Email address" })
  @IsEmail()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email?: string;

  @ApiProperty({ description: "First name of the user creating the account" })
  @IsString()
  firstName: string;

  @ApiProperty({ description: "Last name of the user creating the account" })
  @IsString()
  lastName: string;

  @ApiProperty({ description: "Password for the user creating the account" })
  @IsString()
  password: string;
}

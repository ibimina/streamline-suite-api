import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsBoolean,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateSupplierDto {
  @ApiProperty({
    description: "Supplier name",
    example: "Tech Solutions Ltd",
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: "Contact person name",
    example: "John Smith",
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contact?: string;

  @ApiProperty({
    description: "Email address",
    example: "contact@techsolutions.com",
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: "Phone number",
    example: "+1234567890",
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: "Physical address",
    example: "123 Business Street, City, State",
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({
    description: "Payment terms",
    example: "Net 30",
    default: "Net 30",
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentTerms?: string;

  @ApiProperty({
    description: "Tax identification number",
    example: "TAX123456789",
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiProperty({
    description: "Whether the supplier is active",
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

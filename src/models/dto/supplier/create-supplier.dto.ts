import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsArray,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ContactPersonDto {
  @ApiProperty({ description: "Contact full name", example: "Jane Doe" })
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({
    description: "Contact email",
    example: "jane@example.com",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: "Contact phone number",
    example: "+14155552671",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @ApiPropertyOptional({
    description: "Role or title of the contact person",
    example: "Purchasing Manager",
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  role?: string;

  @ApiPropertyOptional({
    description: "Whether this contact is the primary contact",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  primary?: boolean;
}

export class CreateSupplierDto {
  @ApiProperty({
    description: "Supplier name",
    example: "Tech Solutions Ltd",
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description:
      "Primary contact person name (legacy field, use contacts array instead)",
    example: "John Smith",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contact?: string;

  @ApiPropertyOptional({
    description: "Array of contact persons",
    type: [ContactPersonDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactPersonDto)
  contacts?: ContactPersonDto[];

  @ApiPropertyOptional({
    description: "Primary email address",
    example: "contact@techsolutions.com",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: "Primary phone number",
    example: "+1234567890",
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: "Physical address",
    example: "123 Business Street, City, State",
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({
    description: "Payment terms",
    example: "Net 30",
    default: "Net 30",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentTerms?: string;

  @ApiPropertyOptional({
    description: "Tax identification number",
    example: "TAX123456789",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({
    description: "Whether the supplier is active",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

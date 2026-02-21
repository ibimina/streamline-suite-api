import { CustomerStatus } from "@/models/enums/shared.enum";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
  IsEnum,
  IsBoolean,
  IsArray,
  ArrayUnique,
  ValidateNested,
  IsObject,
  IsMongoId,
} from "class-validator";

/**
 * Customer Creation Data Transfer Object
 *
 * REQUIRED FIELDS (marked with @ApiProperty):
 * - fullName: Customer display name (1-256 characters)
 * - name (in ContactPersonDto): Contact person name (1-128 characters)
 * - name (in BranchDto): Branch name (1-256 characters)
 *
 * ALL OTHER FIELDS ARE OPTIONAL (marked with @ApiPropertyOptional):
 * - Basic Info: companyName, email, phone, address
 * - Addresses: billingAddress, shippingAddress (structured format)
 * - Relationships: contacts[], branches[]
 * - Metadata: tags[], customFields{}, currency, language, status, notes
 *
 * Default Values:
 * - status: 'active' if not specified
 * - isActive (branches): true if not specified
 * - primary (contacts): false if not specified
 */

export class AddressDto {
  @ApiPropertyOptional({
    description: "Street address",
    example: "123 Main St",
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  street?: string;

  @ApiPropertyOptional({ description: "City", example: "San Francisco" })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  city?: string;

  @ApiPropertyOptional({ description: "State or region", example: "CA" })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  state?: string;

  @ApiPropertyOptional({ description: "Postal code", example: "94105" })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  postalCode?: string;

  @ApiPropertyOptional({ description: "Country", example: "USA" })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  country?: string;
}

export class ContactPersonDto {
  @ApiProperty({ description: "Contact full name", example: "Jane Doe" })
  @IsString()
  @Length(1, 128)
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
  @Length(1, 64)
  phone?: string;

  @ApiPropertyOptional({
    description: "Role or title of the contact person",
    example: "Purchasing Manager",
  })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  role?: string;

  @ApiPropertyOptional({
    description: "Whether this contact is the primary contact",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  primary?: boolean;
}

export class BranchDto {
  @ApiProperty({
    description: "Branch name or identifier",
    example: "Downtown Branch",
  })
  @IsString()
  @Length(1, 256)
  name!: string;

  @ApiPropertyOptional({
    description: "Branch code or identifier",
    example: "DTN001",
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  code?: string;

  @ApiPropertyOptional({ type: AddressDto, description: "Branch address" })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({
    description: "Branch contact person",
    example: "John Smith",
  })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  contactPerson?: string;

  @ApiPropertyOptional({
    description: "Branch contact email",
    example: "downtown@acme.com",
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: "Branch contact phone",
    example: "+14155552672",
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  contactPhone?: string;

  @ApiPropertyOptional({
    description: "Branch-specific notes",
    example: "Main procurement office",
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiPropertyOptional({
    description: "Whether this branch is active",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCustomerDto {
  @ApiProperty({
    description: "Customer display name or full name",
    example: "Acme Corp",
  })
  @IsString()
  @Length(1, 256)
  fullName!: string;

  @ApiPropertyOptional({
    description: "Account legal name (if different from display name)",
    example: "Acme Corporation, LLC",
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  companyName?: string;

  @ApiPropertyOptional({
    description: "Primary contact email",
    example: "billing@acme.com",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: "Primary contact phone",
    example: "+14155552671",
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  phone?: string;

  @ApiPropertyOptional({
    description: "Primary/default address (simple format)",
    example: "123 Main St, San Francisco, CA 94105",
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  address?: string;

  @ApiPropertyOptional({ type: AddressDto, description: "Billing address" })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiPropertyOptional({ type: AddressDto, description: "Shipping address" })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;

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
    description: "Array of customer branches/locations",
    type: [BranchDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchDto)
  branches?: BranchDto[];

  @ApiPropertyOptional({
    description: "Customer tags for filtering",
    example: ["vip", "recurring"],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: "Arbitrary custom fields for this customer",
    example: { onboardingCompleted: true },
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({
    description: "Preferred currency (ISO code)",
    example: "USD",
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    description: "Preferred language (ISO code)",
    example: "en",
  })
  @IsOptional()
  @IsString()
  @Length(2, 8)
  language?: string;

  @ApiPropertyOptional({
    description: "Account status",
    enum: CustomerStatus,
    example: CustomerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus = CustomerStatus.ACTIVE;

  @ApiPropertyOptional({
    description: "Free-form notes about the customer",
    example: "Long-time client, prefers email invoicing",
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}

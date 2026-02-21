import { PartialType } from "@nestjs/swagger";
import { CreateCustomerDto } from "./create-customer.dto";

/**
 * Update Customer Data Transfer Object
 *
 * Extends CreateCustomerDto with all fields made optional.
 * Only include fields that need to be updated.
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
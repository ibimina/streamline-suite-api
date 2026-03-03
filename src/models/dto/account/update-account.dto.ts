import {
  IsString,
} from "class-validator";
import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateAccountDto } from "./create-account.dto";

export class UpdateAccountDto extends PartialType(CreateAccountDto) {
@ApiPropertyOptional({ description: "First name of the user creating the account" })
  @IsString()
  currency?: string;
}

import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  IsMongoId,
} from "class-validator";
import { InventoryTransactionStatus,InventoryMovementType } from "@/common/types";

export class CreateInventoryTransactionDto {
  @IsMongoId()
  product: string;

  @IsEnum(InventoryTransactionStatus)
  status: InventoryTransactionStatus;

  @IsEnum(InventoryMovementType)
  movementType: InventoryMovementType;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsMongoId()
  referenceId?: string;

  @IsOptional()
  @IsMongoId()
  warehouse?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

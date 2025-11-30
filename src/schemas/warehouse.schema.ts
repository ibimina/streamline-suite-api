import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type WarehouseDocument = Warehouse & Document;

@Schema({ timestamps: true })
export class Warehouse {
  @Prop({ required: true })
  name: string;

  @Prop()
  address: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop()
  description: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  companyId: string;

  @Prop()
  createdBy: string;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop()
  taxId: string;

  @Prop({ default: 0 })
  creditLimit: number;

  @Prop([String])
  tags: string[]; // e.g. "VIP", "Wholesale", "Retail"

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  companyId: string;

  @Prop()
  createdBy: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

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

  @Prop({ type: Types.ObjectId, ref: "Company" })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

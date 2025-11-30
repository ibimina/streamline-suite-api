import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ required: true })
  name: string;

  @Prop()
  contact: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop({ default: "Net 30" })
  paymentTerms: string; // "Net 30", "Prepaid"

  @Prop()
  taxId: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  companyId: string;

  @Prop()
  createdBy: string;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  industry: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  country?: string;

  @Prop({ trim: true })
  zipCode?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true })
  taxNumber?: string;

  @Prop({ trim: true })
  taxId?: string; // Alternative name for taxNumber

  @Prop({ trim: true })
  registrationNumber?: string;

  // Financial Settings
  @Prop({ default: "NGN" })
  currency: string;

  @Prop({ default: "01-01" })
  fiscalYearStart: string; // e.g. "01-01"

  @Prop({ default: 0 })
  defaultVatRate: number;

  @Prop({ default: 0 })
  defaultWithholdingTaxRate: number;

  @Prop({ trim: true })
  logoUrl?: string; // Public URL for logo access

  @Prop({ required: false,  })
    publicId?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  ownerId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [Types.ObjectId], ref: "User" })
  users: Types.ObjectId[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop({ type: [Types.ObjectId], ref: "Template" })
  templates: Types.ObjectId[];

  @Prop({ trim: true })
  companySize?: string;

  @Prop({ trim: true })
  phoneNumber?: string;

  @Prop({ trim: true })
  description?: string;
  
  @Prop({ trim: true })
  tagline?: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

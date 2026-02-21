import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { CustomerStatus } from "@/models/enums/shared.enum";

export type CustomerDocument = Customer & Document;

// Embedded schema for structured addresses
export class Address {
  @Prop({ type: String })
  street?: string;

  @Prop({ type: String })
  city?: string;

  @Prop({ type: String })
  state?: string;

  @Prop({ type: String })
  postalCode?: string;

  @Prop({ type: String })
  country?: string;
}

// Embedded schema for contact persons
export class ContactPerson {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  role?: string;

  @Prop({ type: Boolean, default: false })
  primary?: boolean;
}

// Embedded schema for customer branches
export class Branch {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({ type: String })
  code?: string;

  @Prop({ type: Address })
  address?: Address;

  @Prop({ type: String })
  contactPerson?: string;

  @Prop({ type: String })
  contactEmail?: string;

  @Prop({ type: String })
  contactPhone?: string;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Boolean, default: true })
  isActive?: boolean;
}

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  fullName: string;

  @Prop()
  companyName?: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  address?: string;

  @Prop({ type: Address })
  billingAddress?: Address;

  @Prop({ type: Address })
  shippingAddress?: Address;

  @Prop({ type: [ContactPerson], default: [] })
  contacts?: ContactPerson[];

  @Prop({ type: [Branch], default: [] })
  branches?: Branch[];

  @Prop()
  taxId?: string;

  @Prop({ default: 0 })
  creditLimit?: number;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: Object })
  customFields?: Record<string, any>;

  @Prop()
  currency?: string;

  @Prop()
  language?: string;

  @Prop({ type: String, enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  status?: CustomerStatus;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: "Account" })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Index for common queries
CustomerSchema.index({ companyId: 1, status: 1 });
CustomerSchema.index({ companyId: 1, fullName: "text", companyName: "text" });

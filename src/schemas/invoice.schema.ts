import { Document, Types } from "mongoose";
import { InvoiceStatus } from "@/common/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class InvoiceItem {
  @Prop({ type: Types.ObjectId, ref: "Product" })
  product?: Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ default: 0 })
  discountPercent: number;

  @Prop({ default: 0 })
  discountAmount: number;

  // VAT per line
  @Prop({ default: 0 })
  vatRate: number;

  @Prop({ default: 0 })
  vatAmount: number;

  // Cost & Profit
  @Prop({ default: 0 })
  unitCost: number;

  @Prop({ default: 0 })
  totalCost: number;

  // Line totals (calculated)
  @Prop({ default: 0 })
  lineTotal: number; // After discount, before VAT

  @Prop({ default: 0 })
  lineTotalInclVat: number; // After discount + VAT

  @Prop({ default: 0 })
  whtAmount: number; // WHT amount per line

  @Prop({ default: 0 })
  netReceivable: number; // lineTotalInclVat - whtAmount

  @Prop({ default: 0 })
  grossProfit: number; // Profit before WHT

  @Prop({ default: 0 })
  netProfit: number; // Profit after WHT
}

@Schema({ timestamps: true })
export class Invoice extends Document {
  @Prop({ type: Types.ObjectId, ref: "Account", required: true })
  account: Types.ObjectId;

  @Prop({ unique: true })
  uniqueId: string;

  @Prop({ type: Types.ObjectId, ref: "Quotation" })
  quotation?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customer: Types.ObjectId;

  @Prop({ type: [InvoiceItem], default: [] })
  items: InvoiceItem[];

  @Prop({ enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Prop()
  issuedDate: Date;

  @Prop()
  dueDate: Date;

  @Prop()
  poNumber?: string; // Purchase Order number

  @Prop({ default: 0 })
  whtRate: number; // Withholding tax rate at invoice level

  @Prop()
  notes?: string;

  @Prop()
  terms?: string;

  @Prop()
  template?: string;

  @Prop()
  templateId?: string;

  @Prop()
  accentColor?: string;

  @Prop({
    type: [{ amount: Number, date: Date, method: String, reference: String }],
    default: [],
  })
  payments: {
    amount: number;
    date: Date;
    method: string;
    reference?: string;
  }[];

  @Prop({ default: 0 })
  amountPaid: number;

  @Prop({ default: 0 })
  balanceDue: number;

  @Prop()
  sentDate?: Date;

  @Prop()
  paidDate?: Date;

  // Totals (calculated)
  @Prop({ default: 0 })
  subtotal: number; // Sum of line subtotals (qty * price)

  @Prop({ default: 0 })
  totalDiscount: number;

  @Prop({ default: 0 })
  totalVat: number;

  @Prop({ default: 0 })
  totalWht: number;

  @Prop({ default: 0 })
  grandTotal: number; // subtotal - discount + VAT

  @Prop({ default: 0 })
  netReceivable: number; // grandTotal - WHT

  // Profit Summary
  @Prop({ default: 0 })
  totalCost: number;

  @Prop({ default: 0 })
  expectedGrossProfit: number;

  @Prop({ default: 0 })
  expectedNetProfit: number;

  @Prop({ default: 0 })
  expectedGrossProfitMargin: number;

  @Prop({ default: 0 })
  expectedNetProfitMargin: number;

  // Legacy fields for backwards compatibility
  @Prop({ default: 0 })
  expectedProfit: number;

  @Prop({ default: 0 })
  expectedProfitMargin: number;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ uniqueId: 1 });
InvoiceSchema.index({ customer: 1, status: 1 });
InvoiceSchema.index({ account: 1, createdAt: -1 });

import { Document, Types } from "mongoose";
import { InvoiceStatus } from "@/common/types";
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';



@Schema({ timestamps: true })
export class InvoiceItem {
  @Prop({ type: Types.ObjectId, ref: 'Product' })
  product?: Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ default: 0 })
  discountPercent: number;

  @Prop()
  discountAmount: number;

  // VAT
  @Prop({ required: true })
  vatRate: number;

  @Prop()
  vatAmount: number;

  @Prop({ default: true })
  subjectToWHT: boolean;

  @Prop()
  whtRate: number;

  @Prop()
  whtAmount: number;

  // Cost & Profit
  @Prop({ required: true })
  unitCost: number;

  @Prop()
  totalCost: number;

  @Prop()
  lineTotalExclTax: number;

  @Prop()
  lineTotalInclTax: number;

  @Prop()
  profitBeforeWHT: number;

  @Prop()
  profitAfterWHT: number;
}

@Schema({ timestamps: true })
export class Invoice extends Document {
  @Prop({ unique: true, required: true })
  invoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Quotation' })
  quotation?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: [InvoiceItem], default: [] })
  items: InvoiceItem[];

  // Totals
  @Prop() subtotalExclTax: number;
  @Prop() totalDiscount: number;
  @Prop() totalVat: number;
  @Prop() totalWHT: number;
  @Prop() grandTotal: number;

  // Profit Summary
  @Prop() totalCostOfGoods: number;
  @Prop() grossProfit: number;           // Revenue - COGS
  @Prop() netProfitAfterWHT: number;     // Final money in pocket

  @Prop({ enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Prop() dueDate: Date;
  @Prop() pdfUrl?: string;

  @Prop({ type: [{ amount: Number, date: Date, method: String }], default: [] })
  payments: { amount: number; date: Date; method: string }[];

  @Prop() amountPaid: number;
  @Prop() balanceDue: number;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ customer: 1, status: 1 });
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { QuotationStatus } from "@/common/types";

export type QuotationDocument = Quotation & Document;
@Schema({ timestamps: true })
export class QuotationItem {
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
  @Prop({ required: true })
  vatRate: number;

  @Prop()
  vatAmount: number;

  @Prop({ required: true })
  unitCost: number;

  @Prop()
  lineTotal: number; // after discount + VAT

  @Prop()
  whtAmount: number; // WHT amount per line

  @Prop()
  netReceivable: number; // lineTotal - whtAmount

  @Prop()
  grossProfit: number; // profit before WHT

  @Prop()
  netProfit: number; // profit after WHT

  @Prop()
  profit: number; // Legacy field (equals netProfit)
}

@Schema({ timestamps: true })
export class Quotation extends Document {
  @Prop({ type: Types.ObjectId, ref: "Account", required: true })
  account: Types.ObjectId;

  @Prop({ unique: true })
  uniqueId: string;

  @Prop({ type: Types.ObjectId, ref: "Customer", required: true })
  customer: Types.ObjectId;

  @Prop({ type: [QuotationItem] })
  items: QuotationItem[];

  @Prop() subtotal: number;
  @Prop() totalDiscount: number;
  @Prop() totalVat: number;
  @Prop() totalWht: number; // Total WHT amount
  @Prop() grandTotal: number;
  @Prop() netReceivable: number; // grandTotal - totalWht
  @Prop() totalCost: number;
  @Prop() expectedGrossProfit: number; // Profit before WHT
  @Prop() expectedNetProfit: number; // Profit after WHT
  @Prop() expectedGrossProfitMargin: number;
  @Prop() expectedNetProfitMargin: number;
  // Legacy fields for backwards compatibility
  @Prop() expectedProfit: number;
  @Prop() expectedProfitMargin: number;

  @Prop()
  template?: string;

  @Prop()
  templateId?: string;

  @Prop()
  accentColor?: string;

  @Prop({ enum: QuotationStatus, default: QuotationStatus.DRAFT })
  status: string;

  @Prop() validUntil?: Date;

  @Prop() convertedToInvoice?: boolean;

  @Prop() notes?: string;
  @Prop() terms?: string;

  @Prop()
  issuedDate: Date;

  @Prop({ default: 0 }) whtRate: number; // Withholding tax rate
  @Prop({ default: 0 }) vatRate: number; // VAT rate

  // Additional fields for tracking who created the quotation
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export const QuotationSchema = SchemaFactory.createForClass(Quotation);

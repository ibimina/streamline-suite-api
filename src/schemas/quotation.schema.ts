import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { QuotationStatus } from "@/common/types";

export type QuotationDocument = Quotation & Document;
@Schema({ timestamps: true })
export class QuotationItem {
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
  profit: number;
}

@Schema({ timestamps: true })
export class Quotation extends Document {
  @Prop({ unique: true })
  quotationNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: [QuotationItem] })
  items: QuotationItem[];

  @Prop() subtotal: number;
  @Prop() totalDiscount: number;
  @Prop() totalVat: number;
  @Prop() grandTotal: number;
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
}

export const QuotationSchema = SchemaFactory.createForClass(Quotation);

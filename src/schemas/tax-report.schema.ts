import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TaxReportDocument = TaxReport & Document;

export enum TaxReportType {
  SALES_TAX = "sales_tax",
  PURCHASE_TAX = "purchase_tax",
  INCOME_TAX = "income_tax",
  VAT = "vat",
  WITHHOLDING_TAX = "withholding_tax",
}

export enum TaxReportStatus {
  DRAFT = "draft",
  PENDING = "pending",
  FILED = "filed",
  PAID = "paid",
  OVERDUE = "overdue",
}

@Schema({ timestamps: true })
export class TaxReport extends Document {
  @Prop({ type: Types.ObjectId, ref: "Account", required: true })
  accountId: Types.ObjectId;

  @Prop({ required: true })
  period: string; // e.g., "Q1 2024", "2024-01"

  @Prop({ enum: TaxReportType, required: true })
  type: TaxReportType;

  @Prop({ required: true, default: 0 })
  amount: number;

  @Prop({ enum: TaxReportStatus, default: TaxReportStatus.DRAFT })
  status: TaxReportStatus;

  @Prop()
  dueDate?: Date;

  @Prop()
  filedDate?: Date;

  @Prop()
  paidDate?: Date;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export const TaxReportSchema = SchemaFactory.createForClass(TaxReport);

TaxReportSchema.index({ accountId: 1, period: 1 });
TaxReportSchema.index({ accountId: 1, type: 1 });
TaxReportSchema.index({ accountId: 1, status: 1 });

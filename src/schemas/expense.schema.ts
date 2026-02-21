import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ExpenseDocument = Expense & Document;

export enum ExpenseCategory {
  RENT = "rent",
  UTILITIES = "utilities",
  SALARIES = "salaries",
  MARKETING = "marketing",
  SUPPLIES = "supplies",
  TRAVEL = "travel",
  DELIVERY = "delivery",
  EQUIPMENT = "equipment",
  MAINTENANCE = "maintenance",
  INSURANCE = "insurance",
  TAXES = "taxes",
  PROFESSIONAL_SERVICES = "professional_services",
  SOFTWARE = "software",
  OTHER = "other",
}

export enum ExpenseStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  PAID = "paid",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  CASH = "cash",
  BANK_TRANSFER = "bank_transfer",
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  CHEQUE = "cheque",
  OTHER = "other",
}

export enum RecurringFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

@Schema({ timestamps: true })
export class Expense extends Document {
  @Prop({ type: Types.ObjectId, ref: "Account", required: true })
  accountId: Types.ObjectId;

  @Prop({ unique: true })
  expenseNumber: string;

  @Prop({ enum: ExpenseCategory, required: true })
  category: ExpenseCategory;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: "NGN" })
  currency: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: Types.ObjectId, ref: "Supplier" })
  vendor?: Types.ObjectId;

  @Prop({ enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @Prop()
  reference?: string;

  @Prop()
  receiptUrl?: string;

  @Prop({ enum: ExpenseStatus, default: ExpenseStatus.PENDING })
  status: ExpenseStatus;

  @Prop()
  notes?: string;

  @Prop([String])
  tags?: string[];

  @Prop({ default: false })
  isRecurring: boolean;

  @Prop({ enum: RecurringFrequency })
  recurringFrequency?: RecurringFrequency;

  @Prop({ type: Types.ObjectId, ref: "User" })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ accountId: 1, date: -1 });
ExpenseSchema.index({ accountId: 1, category: 1 });
ExpenseSchema.index({ accountId: 1, status: 1 });
ExpenseSchema.index({ expenseNumber: 1 });

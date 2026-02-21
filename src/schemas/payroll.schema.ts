import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PayrollDocument = Payroll & Document;

export enum PayrollStatus {
  DRAFT = "draft",
  PENDING = "pending",
  APPROVED = "approved",
  PROCESSING = "processing",
  PAID = "paid",
  CANCELLED = "cancelled",
}

export enum PayFrequency {
  WEEKLY = "weekly",
  BI_WEEKLY = "bi-weekly",
  SEMI_MONTHLY = "semi-monthly",
  MONTHLY = "monthly",
}

export enum DeductionType {
  TAX = "tax",
  PENSION = "pension",
  HEALTH_INSURANCE = "health_insurance",
  LOAN = "loan",
  ADVANCE = "advance",
  OTHER = "other",
}

export enum AllowanceType {
  HOUSING = "housing",
  TRANSPORT = "transport",
  MEAL = "meal",
  BONUS = "bonus",
  OVERTIME = "overtime",
  COMMISSION = "commission",
  OTHER = "other",
}

export enum PaymentItemStatus {
  PENDING = "pending",
  PAID = "paid",
}

@Schema()
export class PayrollDeduction {
  @Prop({ enum: DeductionType, required: true })
  type: DeductionType;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: false })
  isPercentage: boolean;

  @Prop()
  percentage?: number;
}

@Schema()
export class PayrollAllowance {
  @Prop({ enum: AllowanceType, required: true })
  type: AllowanceType;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: false })
  isPercentage: boolean;

  @Prop()
  percentage?: number;
}

@Schema()
export class PayrollItem {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  staff: Types.ObjectId;

  @Prop({ required: true })
  basicSalary: number;

  @Prop({ type: [PayrollAllowance], default: [] })
  allowances: PayrollAllowance[];

  @Prop({ default: 0 })
  totalAllowances: number;

  @Prop({ type: [PayrollDeduction], default: [] })
  deductions: PayrollDeduction[];

  @Prop({ default: 0 })
  totalDeductions: number;

  @Prop({ required: true })
  grossPay: number;

  @Prop({ required: true })
  netPay: number;

  @Prop()
  paymentDate?: Date;

  @Prop({ enum: ["bank_transfer", "cash", "cheque"] })
  paymentMethod?: string;

  @Prop({ type: Object })
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };

  @Prop({ enum: PaymentItemStatus, default: PaymentItemStatus.PENDING })
  status: PaymentItemStatus;
}

@Schema({ timestamps: true })
export class Payroll extends Document {
  @Prop({ type: Types.ObjectId, ref: "Account", required: true })
  accountId: Types.ObjectId;

  @Prop({ unique: true })
  payrollNumber: string;

  @Prop({ required: true })
  payPeriodStart: Date;

  @Prop({ required: true })
  payPeriodEnd: Date;

  @Prop({ required: true })
  payDate: Date;

  @Prop({ enum: PayFrequency, required: true })
  payFrequency: PayFrequency;

  @Prop({ type: [PayrollItem], default: [] })
  items: PayrollItem[];

  @Prop({ default: 0 })
  totalGrossPay: number;

  @Prop({ default: 0 })
  totalDeductions: number;

  @Prop({ default: 0 })
  totalNetPay: number;

  @Prop({ default: 0 })
  totalAllowances: number;

  @Prop({ default: 0 })
  employeeCount: number;

  @Prop({ enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status: PayrollStatus;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  processedBy?: Types.ObjectId;

  @Prop()
  processedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);

PayrollSchema.index({ accountId: 1, payPeriodStart: -1 });
PayrollSchema.index({ accountId: 1, status: 1 });
PayrollSchema.index({ payrollNumber: 1 });

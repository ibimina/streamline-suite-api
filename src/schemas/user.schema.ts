import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { UserRole } from "@/common/types";

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  // Computed full name
  get name(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: String,
    enum: [
      "owner",
      "admin",
      "sales",
      "procurement",
      "accountant",
      "warehouse",
      "staff",
    ],
    default: "staff",
  })
  role: string;

  @Prop({ type: Types.ObjectId, ref: "Company" })
  companyId?: Types.ObjectId;

  // HR/Payroll fields
  @Prop({ default: 0 })
  salary: number;

  @Prop()
  employeeId?: string;

  @Prop()
  department?: string;

  @Prop()
  position?: string;

  @Prop()
  hireDate?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  phone?: string;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: Date })
  passwordChangedAt?: Date;

  // Token versioning for logout without storing actual tokens
  @Prop({ default: 1 })
  tokenVersion: number;

  // Global logout timestamp - tokens issued before this are invalid
  @Prop({ type: Date })
  lastGlobalLogout?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

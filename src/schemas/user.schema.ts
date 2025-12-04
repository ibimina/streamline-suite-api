import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { UserRole } from "@/common/types";
import { PermissionName, RoleName } from "@/models/enums/shared.enum";

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
    enum:RoleName,
    default: "Staff",
  })
  role: string;

  @Prop({ type: Types.ObjectId, ref: "Account" })
  account: Types.ObjectId;

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

  @Prop({ type: [String], default: [], enum: PermissionName })
  permissions?: string[];

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

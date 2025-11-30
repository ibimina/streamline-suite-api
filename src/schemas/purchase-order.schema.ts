import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type PurchaseOrderDocument = PurchaseOrder & Document;

@Schema({ timestamps: true })
export class PurchaseOrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Product", required: true })
  product: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  total: number;

  @Prop()
  receivedQuantity: number;

  @Prop()
  notes: string;
}

@Schema({ timestamps: true })
export class PurchaseOrder {
  @Prop({ required: true, unique: true })
  poNumber: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  })
  supplier: string;

  @Prop([PurchaseOrderItem])
  items: PurchaseOrderItem[];

  @Prop({
    type: String,
    enum: ["draft", "sent", "received", "partial", "cancelled"],
    default: "draft",
  })
  status: string;

  @Prop()
  receivedDate: Date;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop()
  notes: string;

  @Prop()
  companyId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
  createdBy: string;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);

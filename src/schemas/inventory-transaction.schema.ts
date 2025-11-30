import { InventoryTransactionStatus } from "@/common/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type InventoryTransactionDocument = InventoryTransaction & Document;

@Schema({ timestamps: true })
export class InventoryTransaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Product", required: true })
  product: string;

  @Prop({enum: InventoryTransactionStatus, required: true, default:InventoryTransactionStatus.PURCHASE
  })
  type: string;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  unitCost: number; // Cost at time of transaction

  @Prop()
  reference: string; // e.g. Purchase #PO-001, Invoice #INV-005

  @Prop({ type: MongooseSchema.Types.ObjectId })
  referenceId: string; // Link to Purchase/Invoice

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Warehouse" })
  warehouse: string; // Future-proof

  @Prop()
  expiryDate: Date;

  @Prop([String])
  serialNumbers: string[]; // For serialized items

  @Prop()
  notes: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
  createdBy: string;

  @Prop()
  companyId: string;

  // Calculated fields
  @Prop()
  runningBalance: number; // Stock after this transaction

  @Prop()
  averageCost: number; // Weighted average cost after transaction
}

export const InventoryTransactionSchema =
  SchemaFactory.createForClass(InventoryTransaction);

// Middleware to update product stock
InventoryTransactionSchema.post("save", async function () {
  // This will be implemented to recalculate stock and average cost
  console.log("Inventory transaction saved, updating product stock...");
});

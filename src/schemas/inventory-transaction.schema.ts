import { InventoryTransactionStatus } from "@/common/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type InventoryTransactionDocument = InventoryTransaction & Document;

@Schema({ timestamps: true })
export class InventoryTransaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Product", required: true })
  product: string;

  @Prop({
    enum: InventoryTransactionStatus,
    required: true,
    default: InventoryTransactionStatus.PURCHASE,
  })
  status: string;

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
  try {
    const TxModel = this.constructor as any;
    const ProductModel = TxModel.db.model("Product");

    // Helper: decide whether a transaction increases stock
    const isPositive = (status: string) => {
      const s = String(status || "").toLowerCase();
      if (/pur|in|add|receive|return|open|restock|stock_in|credit/.test(s))
        return true;
      if (/sale|out|remove|deduct|consume|stock_out|debit/.test(s))
        return false;
      return true;
    };

    // Aggregate all transactions for this product (and same account if present)
    const query: any = { product: this.product };
    if (this.companyId) query.companyId = this.companyId;

    const txs = await TxModel.find(query).sort({ createdAt: 1 }).lean();

    let runningQty = 0;
    let avgCost = 0;

    // Recalculate running balance and average cost step-by-step
    for (const tx of txs) {
      const signPositive = isPositive(tx.status);
      const q = Number(tx.quantity) || 0;
      const unitCost = Number(tx.unitCost) || 0;

      if (signPositive) {
        const prevQty = runningQty;
        const prevAvg = avgCost;
        const newQty = prevQty + q;

        if (newQty > 0) {
          // Weighted average for incoming transactions
          avgCost =
            prevQty > 0
              ? (prevQty * prevAvg + q * unitCost) / newQty
              : unitCost;
        } else {
          avgCost = unitCost || prevAvg;
        }

        runningQty = newQty;
      } else {
        // Outgoing transactions reduce quantity but do not change average cost
        runningQty = Math.max(0, runningQty - q);
      }

      // Update the historical transaction doc with calculated fields (no save hook triggered)
      await TxModel.findByIdAndUpdate(tx._id, {
        runningBalance: runningQty,
        averageCost: avgCost,
      }).exec();
    }

    // Update product master stock / average cost (best-effort)
    await ProductModel.findByIdAndUpdate(this.product, {
      stock: runningQty,
      averageCost: avgCost,
    }).exec();

    console.log(
      "Inventory transaction saved, stock and average cost recalculated."
    );
  } catch (err) {
    console.error(
      "Failed to recalculate inventory after transaction save:",
      err
    );
  }
  console.log("Inventory transaction saved, updating product stock...");
});

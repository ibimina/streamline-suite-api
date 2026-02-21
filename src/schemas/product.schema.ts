import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ unique: true, sparse: true })
  sku: string;

  @Prop()
  barcode: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  // Type
  @Prop({
    type: String,
    enum: ["product", "service", "consumable", "digital"],
    default: "product",
  })
  type: string;

  // Inventory Settings
  @Prop({ default: true })
  trackInventory: boolean;

  @Prop({ default: false })
  trackSerialNumber: boolean;

  @Prop({ default: false })
  trackExpiryDate: boolean;

  // Pricing & Cost
  @Prop({ default: 0 })
  costPrice: number; // Average or last purchase cost

  @Prop({ required: true })
  sellingPrice: number;

  @Prop()
  wholesalePrice: number;

  // Stock
  @Prop({ default: "pcs" })
  unit: string; // pcs, kg, liter, box, hour

  @Prop({ default: 0 })
  currentStock: number; // Auto-calculated from inventory transactions

  @Prop({ default: 0 })
  lowStockAlert: number;

  @Prop()
  category: string;

  @Prop()
  brand: string;

  @Prop([String])
  images: string[];

  // Taxes
  @Prop({ default: 0 })
  salesTaxRate: number;

  @Prop({ default: 0 })
  purchaseTaxRate: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  companyId: string;

  @Prop()
  createdBy: string;

  @Prop({type: String, enum: ["stock_in", "stock_out", "discontinued"], default: "stock_in"})
  status: string;

@Prop({ type: Types.ObjectId, ref: "Supplier" })
  supplier: Types.ObjectId;  

  @Prop({ type: [Types.ObjectId], ref: "Supplier" })
  alternativeSuppliers: Types.ObjectId[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

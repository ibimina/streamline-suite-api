import { ActivityType, ActivityPriority } from "@/models/enums/shared.enum";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ActivityDocument = Activity & Document;

@Schema({
  timestamps: true,
  collection: "activities",
})
export class Activity {
  @Prop({ required: true, type: String, enum: Object.values(ActivityType) })
  type: ActivityType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: Types.ObjectId, ref: "Account" })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  user?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId; // ID of the related entity (invoice, quotation, etc.)

  @Prop()
  entityType?: string; // Type of the related entity (invoice, quotation, product, etc.)

  @Prop({
    type: String,
    enum: Object.values(ActivityPriority),
    default: ActivityPriority.MEDIUM,
  })
  priority: ActivityPriority;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Additional data (amounts, customer names, etc.)

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  readBy?: Types.ObjectId;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Indexes for better performance
ActivitySchema.index({ accountId: 1, createdAt: -1 });
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ type: 1, accountId: 1 });
ActivitySchema.index({ isRead: 1, accountId: 1 });
ActivitySchema.index({ priority: 1, accountId: 1 });
ActivitySchema.index({ entityId: 1, entityType: 1 });

// Virtual for relative time
ActivitySchema.virtual("timeAgo").get(function () {
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - this.createdAt.getTime()) / (1000 * 60)
  );
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  } else if (diffInDays === 1) {
    return "yesterday";
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  } else {
    return this.createdAt.toLocaleDateString();
  }
});

// Ensure virtual fields are included in JSON output
ActivitySchema.set("toJSON", { virtuals: true });

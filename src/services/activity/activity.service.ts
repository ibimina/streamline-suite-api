import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ObjectId, Types } from "mongoose";
import { Activity, ActivityDocument } from "@/schemas/activity.schema";
import { ActivityType, ActivityPriority } from "@/models/enums/shared.enum";

export interface CreateActivityDto {
  type: ActivityType;
  title: string;
  description: string;
  account: ObjectId;
  user?: ObjectId;
  entityId?: ObjectId;
  entityType?: string;
  priority?: ActivityPriority;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    const activity = new this.activityModel({
      ...createActivityDto,
      account: createActivityDto.account,
      userId: createActivityDto.user ? createActivityDto.user : undefined,
      entityId: createActivityDto.entityId
        ? createActivityDto.entityId
        : undefined,
    });

    return activity.save();
  }

  async findByAccount(
    accountId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      type?: ActivityType;
      priority?: ActivityPriority;
      isRead?: boolean;
      userId?: string;
    },
  ): Promise<Activity[]> {
    const query: any = { accountId: new Types.ObjectId(accountId) };

    if (filters?.type) query.type = filters.type;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.isRead !== undefined) query.isRead = filters.isRead;
    if (filters?.userId) query.userId = new Types.ObjectId(filters.userId);

    return this.activityModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("userId", "firstName lastName email")
      .lean()
      .exec();
  }

  async markAsRead(activityId: string, userId: string): Promise<Activity> {
    return this.activityModel.findByIdAndUpdate(
      activityId,
      {
        isRead: true,
        readAt: new Date(),
        readBy: new Types.ObjectId(userId),
      },
      { new: true },
    );
  }

  async markMultipleAsRead(
    activityIds: string[],
    userId: string,
  ): Promise<void> {
    await this.activityModel.updateMany(
      { _id: { $in: activityIds.map((id) => new Types.ObjectId(id)) } },
      {
        isRead: true,
        readAt: new Date(),
        readBy: new Types.ObjectId(userId),
      },
    );
  }

  async getUnreadCount(accountId: string, userId?: string): Promise<number> {
    const query: any = {
      accountId: new Types.ObjectId(accountId),
      isRead: false,
    };

    if (userId) {
      query.$or = [
        { userId: new Types.ObjectId(userId) },
        { userId: { $exists: false } }, // System-wide activities
      ];
    }

    return this.activityModel.countDocuments(query);
  }

  async getRecentActivities(
    accountId: string,
    limit: number = 10,
  ): Promise<{ text: string; time: string }[]> {
    const activities = await this.activityModel
      .find({ accountId: new Types.ObjectId(accountId) })
      .sort({ createdAt: -1 })
      // .limit(limit)
      .select("title description createdAt type metadata user")
      .populate("user", "firstName lastName email")
      .lean()
      .exec();

    console.log("Fetched Activities:", activities);

    return activities.map((activity) => ({
      text: this.formatActivityText(activity),
      time: this.getRelativeTime(activity.createdAt),
    }));
  }

  private formatActivityText(activity: any): string {
    const { title, description, type, user } = activity;

    // Use metadata for richer formatting if available
    // if (metadata?.customerName) {
    //   return `${title} by ${user ? user.firstName + " " + user.lastName : "System"} for ${metadata.customerName}`;
    // }

    // if (metadata?.productName) {
    //   return `${title}: ${metadata.productName}`;
    // }

    // if (metadata?.amount) {
    //   return `${title} - $${metadata.amount.toLocaleString()}`;
    // }
    console.log(type, ActivityType.USER_LOGIN, user);
    if (type === ActivityType.USER_LOGIN) {
      return `${user ? user.firstName + " " + user.lastName : "A user"} logged in`;
    }

    return title;

    // return title || description;
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
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
      return date.toLocaleDateString();
    }
  }

  // Helper methods for common activity types
  async logInvoiceActivity(
    type: ActivityType,
    invoiceId: ObjectId,
    account: ObjectId,
    user?: ObjectId,
    metadata?: Record<string, any>,
  ): Promise<Activity> {
    const titles = {
      [ActivityType.INVOICE_CREATED]: "Invoice created",
      [ActivityType.INVOICE_SENT]: "Invoice sent",
      [ActivityType.INVOICE_PAID]: "Invoice paid",
      [ActivityType.INVOICE_OVERDUE]: "Invoice overdue",
    };

    return this.create({
      type,
      title: titles[type] || "Invoice activity",
      description: `Invoice ${metadata?.invoiceNumber || invoiceId} ${type.replace("invoice_", "")}`,
      account,
      user,
      entityId: invoiceId,
      entityType: "invoice",
      priority:
        type === ActivityType.INVOICE_OVERDUE
          ? ActivityPriority.HIGH
          : ActivityPriority.MEDIUM,
      metadata,
    });
  }

  async logQuotationActivity(
    type: ActivityType,
    quotationId: ObjectId,
    account: ObjectId,
    user?: ObjectId,
    metadata?: Record<string, any>,
  ): Promise<Activity> {
    const titles = {
      [ActivityType.QUOTATION_CREATED]: "Quotation created",
      [ActivityType.QUOTATION_SENT]: "Quotation sent",
      [ActivityType.QUOTATION_ACCEPTED]: "Quotation accepted",
      [ActivityType.QUOTATION_DECLINED]: "Quotation declined",
      [ActivityType.QUOTATION_CONVERTED]: "Quotation converted to invoice",
    };

    return this.create({
      type,
      title: titles[type] || "Quotation activity",
      description: `Quotation ${metadata?.uniqueId || quotationId} ${type.replace("quotation_", "")}`,
      account,
      user,
      entityId: quotationId,
      entityType: "quotation",
      priority: ActivityPriority.MEDIUM,
      metadata,
    });
  }

  async logProductActivity(
    type: ActivityType,
    productId: ObjectId,
    account: ObjectId,
    user?: ObjectId,
    metadata?: Record<string, any>,
  ): Promise<Activity> {
    const titles = {
      [ActivityType.PRODUCT_CREATED]: "Product added",
      [ActivityType.PRODUCT_UPDATED]: "Product updated",
      [ActivityType.PRODUCT_LOW_STOCK]: "Low stock alert",
    };

    return this.create({
      type,
      title: titles[type] || "Product activity",
      description: `Product ${metadata?.productName || productId} ${type.replace("product_", "")}`,
      account,
      user,
      entityId: productId,
      entityType: "product",
      priority:
        type === ActivityType.PRODUCT_LOW_STOCK
          ? ActivityPriority.HIGH
          : ActivityPriority.MEDIUM,
      metadata,
    });
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CreateAccountDto } from "@/models/dto/account/create-account.dto";
import { UpdateAccountDto } from "@/models/dto/account/update-account.dto";
import { ActivityService } from "../activity/activity.service";

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel("Invoice") private invoiceModel: Model<any>,
    @InjectModel("Customer") private customerModel: Model<any>,
    @InjectModel("Quotation") private quotationModel: Model<any>,
    @InjectModel("Product") private productModel: Model<any>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly activityService: ActivityService
  ) {}

  async getStats(accountId: string): Promise<any> {
    try {
      // Date ranges for calculations
      const now = new Date();
      const currentYear = now.getFullYear();
      const startOfMonth = new Date(currentYear, now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      // Year to date range (January 1st to current date)
      const startOfYear = new Date(currentYear, 0, 1); // January 1st of current year

      // Parallel execution of all aggregations for better performance
      const [
        salesData,
        outstandingInvoices,
        weeklyQuotations,
        topProducts,
        lowStockProducts,
        recentActivities,
        totalCustomers,
        monthlyGrowth,
      ] = await Promise.all([
        // 1. Total sales for current year (year-to-date)
        this.invoiceModel.aggregate([
          {
            $match: {
              accountId: accountId,
              status: { $in: ["PAID", "PARTIALLY_PAID"] },
              createdAt: { $gte: startOfYear },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              totalRevenue: { $sum: "$grandTotal" },
              totalProfit: { $sum: "$totalNetProfit" },
              invoiceCount: { $sum: 1 },
            },
          },
          {
            $sort: { "_id.year": 1, "_id.month": 1 },
          },
        ]),

        // 2. Outstanding invoices
        this.invoiceModel.aggregate([
          {
            $match: {
              accountId: accountId,
              status: { $in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] },
            },
          },
          {
            $group: {
              _id: null,
              totalOutstanding: { $sum: "$balanceDue" },
              count: { $sum: 1 },
              overdue: {
                $sum: {
                  $cond: [{ $lt: ["$dueDate", now] }, 1, 0],
                },
              },
              overdueAmount: {
                $sum: {
                  $cond: [{ $lt: ["$dueDate", now] }, "$balanceDue", 0],
                },
              },
            },
          },
        ]),

        // 3. Quotations for present week
        this.quotationModel.aggregate([
          {
            $match: {
              accountId: accountId,
              createdAt: { $gte: startOfWeek },
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalValue: { $sum: "$grandTotal" },
            },
          },
        ]),

        // 4. Top selling products (by quantity and revenue)
        this.invoiceModel.aggregate([
          {
            $match: {
              accountId: accountId,
              status: { $in: ["PAID", "PARTIALLY_PAID"] },
              createdAt: { $gte: startOfMonth },
            },
          },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product",
              totalQuantity: { $sum: "$items.quantity" },
              totalRevenue: { $sum: "$items.lineTotalInclTax" },
              productName: { $first: "$items.description" },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "productDetails",
            },
          },
        ]),

        // 5. Low stock products
        this.productModel.aggregate([
          {
            $match: {
              companyId: accountId,
              isActive: true,
              trackInventory: true,
              $expr: { $lte: ["$currentStock", "$lowStockAlert"] },
            },
          },
          {
            $project: {
              name: 1,
              sku: 1,
              currentStock: 1,
              lowStockAlert: 1,
              stockDifference: {
                $subtract: ["$lowStockAlert", "$currentStock"],
              },
            },
          },
          { $sort: { stockDifference: -1 } },
          { $limit: 10 },
        ]),

        // 6. Recent activities from activity service
        this.activityService.getRecentActivities(accountId, 10),

        // 7. Total customers
        this.customerModel.countDocuments({ accountId }),

        // 8. Monthly growth comparison (current year)
        this.invoiceModel.aggregate([
          {
            $match: {
              accountId: accountId,
              status: { $in: ["PAID", "PARTIALLY_PAID"] },
              createdAt: { $gte: startOfYear },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              revenue: { $sum: "$grandTotal" },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      // Process and format the results
      const totalRevenueYTD = salesData.reduce(
        (sum, item) => sum + item.totalRevenue,
        0
      );
      const totalProfitYTD = salesData.reduce(
        (sum, item) => sum + item.totalProfit,
        0
      );
      const totalInvoicesYTD = salesData.reduce(
        (sum, item) => sum + item.invoiceCount,
        0
      );

      // Outstanding invoices summary
      const outstandingData = outstandingInvoices[0] || {
        totalOutstanding: 0,
        count: 0,
        overdue: 0,
        overdueAmount: 0,
      };

      // Weekly quotations summary
      const quotationSummary = weeklyQuotations.reduce(
        (acc, item) => {
          acc[item._id] = { count: item.count, value: item.totalValue };
          acc.total.count += item.count;
          acc.total.value += item.totalValue;
          return acc;
        },
        { total: { count: 0, value: 0 } }
      );

      // Recent activities are now provided by ActivityService
      const combinedActivities = recentActivities;

      // Calculate growth metrics
      const currentMonthData = monthlyGrowth.find(
        (m) => m._id.year === currentYear && m._id.month === now.getMonth() + 1
      ) || { revenue: 0, count: 0 };

      const lastMonthData = monthlyGrowth.find(
        (m) => m._id.year === currentYear && m._id.month === now.getMonth()
      ) || { revenue: 0, count: 0 };

      const revenueGrowth =
        lastMonthData.revenue > 0
          ? ((currentMonthData.revenue - lastMonthData.revenue) /
              lastMonthData.revenue) *
            100
          : 0;

      return {
        // Overview
        totalRevenueYTD: Math.round(totalRevenueYTD * 100) / 100,
        totalProfitYTD: Math.round(totalProfitYTD * 100) / 100,
        totalInvoicesYTD,
        totalCustomers,
        profitMargin:
          totalRevenueYTD > 0
            ? Math.round((totalProfitYTD / totalRevenueYTD) * 10000) / 100
            : 0,

        // Outstanding
        outstandingInvoices: {
          total: Math.round(outstandingData.totalOutstanding * 100) / 100,
          count: outstandingData.count,
          overdue: outstandingData.overdue,
          overdueAmount: Math.round(outstandingData.overdueAmount * 100) / 100,
        },

        // Weekly quotations
        weeklyQuotations: quotationSummary,

        // Growth metrics
        growth: {
          revenueGrowthPercent: Math.round(revenueGrowth * 100) / 100,
          currentMonthRevenue: Math.round(currentMonthData.revenue * 100) / 100,
          lastMonthRevenue: Math.round(lastMonthData.revenue * 100) / 100,
        },

        // Products
        topProducts: topProducts.map((product) => ({
          id: product._id,
          name: product.productDetails[0]?.name || product.productName,
          sku: product.productDetails[0]?.sku,
          quantity: product.totalQuantity,
          revenue: Math.round(product.totalRevenue * 100) / 100,
        })),

        lowStockProducts: lowStockProducts.map((product) => ({
          id: product._id,
          name: product.name,
          sku: product.sku,
          currentStock: product.currentStock,
          lowStockAlert: product.lowStockAlert,
          deficit: product.stockDifference,
        })),

        // Recent activities
        recentActivities: combinedActivities,

        // Sales trend (year-to-date by month)
        salesTrend: salesData.map((item) => ({
          period: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
          revenue: Math.round(item.totalRevenue * 100) / 100,
          profit: Math.round(item.totalProfit * 100) / 100,
          invoices: item.invoiceCount,
        })),
      };
    } catch (error) {
      console.error("Error in getStats:", error);
      throw new Error(`Failed to fetch account statistics: ${error.message}`);
    }
  }

  async create(
    createAccountDto: CreateAccountDto,
    userId: string
  ): Promise<Account> {
    const account = new this.accountModel({
      ...createAccountDto,
      ownerId: userId,
    });

    return account.save();
  }

  async findOne(id: string): Promise<Account> {
    const account = await this.accountModel.findById(id).exec();

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    return account;
  }

  async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
    userId: string
  ): Promise<Account> {
    const account = await this.accountModel.findById(id).exec();

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    Object.assign(account, updateAccountDto);
    return account.save();
  }

  async uploadLogo(
    uploadFileDto: UploadFileDto,
    companyId: string
  ): Promise<any> {
    const account = await this.accountModel.findById(companyId).exec();

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const result = await this.cloudinaryService.uploadImage(uploadFileDto);

    await this.accountModel.findByIdAndUpdate(companyId, {
      logoUrl: result.secure_url,
      publicId: result.public_id,
    });
    return;
  }

  async deleteLogo(id: string, userId: string): Promise<any> {
    const account = await this.accountModel.findById(id).exec();
    // Check permissions
    if (account.ownerId.toString() !== userId) {
      throw new ForbiddenException(
        "You do not have permission to update this account"
      );
    }

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    await this.cloudinaryService.deleteImage(account.publicId);

    account.logoUrl = undefined;
    account.publicId = undefined;
    return account.save();
  }
}

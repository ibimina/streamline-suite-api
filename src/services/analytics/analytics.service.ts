import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { Invoice, InvoiceDocument } from "@/schemas/invoice.schema";
import { Quotation, QuotationDocument } from "@/schemas/quotation.schema";
import { Customer, CustomerDocument } from "@/schemas/customer.schema";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,
    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Quotation.name)
    private quotationModel: Model<QuotationDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>
  ) {}

  async getAnalytics(
    accountId: string,
    query?: { startDate?: string; endDate?: string; period?: string }
  ): Promise<any> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const accountObjectId = account._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Previous month for comparison
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month KPIs
    const currentMonthStats = await this.invoiceModel.aggregate([
      {
        $match: {
          accountId: accountObjectId,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          status: { $in: ["paid", "sent"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grandTotal" },
          totalProfit: { $sum: "$totalNetProfit" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Previous month for comparison
    const prevMonthStats = await this.invoiceModel.aggregate([
      {
        $match: {
          accountId: accountObjectId,
          createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
          status: { $in: ["paid", "sent"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grandTotal" },
          totalProfit: { $sum: "$totalNetProfit" },
          count: { $sum: 1 },
        },
      },
    ]);

    const current = currentMonthStats[0] || {
      totalRevenue: 0,
      totalProfit: 0,
      count: 0,
    };
    const prev = prevMonthStats[0] || {
      totalRevenue: 0,
      totalProfit: 0,
      count: 0,
    };

    // Calculate changes
    const revenueChange =
      prev.totalRevenue > 0
        ? ((current.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100
        : 0;
    const profitChange =
      prev.totalProfit > 0
        ? ((current.totalProfit - prev.totalProfit) / prev.totalProfit) * 100
        : 0;
    const avgSaleChange =
      prev.count > 0 && current.count > 0
        ? ((current.totalRevenue / current.count -
            prev.totalRevenue / prev.count) /
            (prev.totalRevenue / prev.count)) *
          100
        : 0;

    // Get revenue/profit trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const revenueProfitTrend = await this.invoiceModel.aggregate([
      {
        $match: {
          accountId: accountObjectId,
          createdAt: { $gte: twelveMonthsAgo },
          status: { $in: ["paid", "sent"] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$grandTotal" },
          profit: { $sum: "$totalNetProfit" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Get sales by service/category
    const salesByService = await this.invoiceModel.aggregate([
      {
        $match: {
          accountId: accountObjectId,
          createdAt: { $gte: twelveMonthsAgo },
          status: { $in: ["paid", "sent"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.description",
          sales: { $sum: "$items.lineTotalInclTax" },
        },
      },
      { $sort: { sales: -1 } },
      { $limit: 10 },
    ]);

    // Get top customers
    const topCustomers = await this.invoiceModel.aggregate([
      {
        $match: {
          accountId: accountObjectId,
          createdAt: { $gte: twelveMonthsAgo },
          status: { $in: ["paid", "sent"] },
        },
      },
      {
        $group: {
          _id: "$customer",
          value: { $sum: "$grandTotal" },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customerInfo",
        },
      },
      { $unwind: { path: "$customerInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ["$customerInfo.name", "Unknown Customer"] },
          value: 1,
        },
      },
    ]);

    return {
      kpis: {
        totalRevenue: current.totalRevenue || 0,
        totalProfit: current.totalProfit || 0,
        averageSaleValue:
          current.count > 0 ? current.totalRevenue / current.count : 0,
        revenueChange: Math.round(revenueChange * 100) / 100,
        profitChange: Math.round(profitChange * 100) / 100,
        avgSaleChange: Math.round(avgSaleChange * 100) / 100,
      },
      revenueProfitTrend: revenueProfitTrend.map((item) => ({
        month: `${item._id.year}-${item._id.month.toString().padStart(2, "0")}`,
        revenue: item.revenue || 0,
        profit: item.profit || 0,
      })),
      salesByService: salesByService.map((item) => ({
        name: item._id || "Other",
        sales: item.sales || 0,
      })),
      topCustomers: topCustomers.map((item) => ({
        name: item.name,
        value: item.value || 0,
      })),
    };
  }

  async getRevenueBreakdown(accountId: string): Promise<any> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const breakdown = await this.invoiceModel.aggregate([
      {
        $match: {
          accountId: account._id,
          createdAt: { $gte: twelveMonthsAgo },
          status: { $in: ["paid", "sent"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.description",
          amount: { $sum: "$items.lineTotalInclTax" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 10 },
    ]);

    return {
      categories: breakdown.map((item) => ({
        name: item._id || "Other",
        amount: item.amount || 0,
      })),
    };
  }

  async getTopCustomers(accountId: string, limit = 10): Promise<any> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const customers = await this.invoiceModel.aggregate([
      {
        $match: {
          accountId: account._id,
          createdAt: { $gte: twelveMonthsAgo },
          status: { $in: ["paid", "sent"] },
        },
      },
      {
        $group: {
          _id: "$customer",
          revenue: { $sum: "$grandTotal" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customerInfo",
        },
      },
      { $unwind: { path: "$customerInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ["$customerInfo.name", "Unknown Customer"] },
          revenue: 1,
        },
      },
    ]);

    return { customers };
  }

  async getSalesTrend(
    accountId: string,
    period: "daily" | "weekly" | "monthly" | "yearly" = "monthly"
  ): Promise<any> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    let lookbackDate = new Date();
    let groupBy: any;

    switch (period) {
      case "daily":
        lookbackDate.setDate(lookbackDate.getDate() - 30);
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };
        break;
      case "weekly":
        lookbackDate.setDate(lookbackDate.getDate() - 90);
        groupBy = {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" },
        };
        break;
      case "yearly":
        lookbackDate.setFullYear(lookbackDate.getFullYear() - 5);
        groupBy = { year: { $year: "$createdAt" } };
        break;
      default:
        lookbackDate.setMonth(lookbackDate.getMonth() - 12);
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        };
    }

    const trend = await this.invoiceModel.aggregate([
      {
        $match: {
          accountId: account._id,
          createdAt: { $gte: lookbackDate },
          status: { $in: ["paid", "sent"] },
        },
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: "$grandTotal" },
          profit: { $sum: "$totalNetProfit" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 } },
    ]);

    const formatPeriod = (item: any) => {
      if (item._id.day) {
        return `${item._id.year}-${item._id.month
          .toString()
          .padStart(2, "0")}-${item._id.day.toString().padStart(2, "0")}`;
      } else if (item._id.week) {
        return `${item._id.year}-W${item._id.week.toString().padStart(2, "0")}`;
      } else if (item._id.month) {
        return `${item._id.year}-${item._id.month.toString().padStart(2, "0")}`;
      }
      return item._id.year.toString();
    };

    return {
      trend: trend.map((item) => ({
        period: formatPeriod(item),
        revenue: item.revenue || 0,
        profit: item.profit || 0,
      })),
    };
  }
}

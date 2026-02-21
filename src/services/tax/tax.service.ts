import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  TaxReport,
  TaxReportDocument,
  TaxReportStatus,
  TaxReportType,
} from "@/schemas/tax-report.schema";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { Invoice, InvoiceDocument } from "@/schemas/invoice.schema";
import { CreateTaxReportDto } from "@/models/dto/tax/create-tax-report.dto";
import { PaginationQuery, PaginatedResponse } from "@/common/types";

@Injectable()
export class TaxService {
  constructor(
    @InjectModel(TaxReport.name)
    private taxReportModel: Model<TaxReportDocument>,
    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,
    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>
  ) {}

  async generateReport(
    createTaxReportDto: CreateTaxReportDto,
    accountId: string,
    userId: string
  ): Promise<TaxReport> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Calculate tax amount based on type and period
    let amount = 0;
    const periodParts = createTaxReportDto.period.split(" ");
    let startDate: Date;
    let endDate: Date;

    // Parse period (e.g., "Q1 2024" or "2024-01")
    if (periodParts[0].startsWith("Q")) {
      const quarter = parseInt(periodParts[0].substring(1));
      const year = parseInt(periodParts[1]);
      startDate = new Date(year, (quarter - 1) * 3, 1);
      endDate = new Date(year, quarter * 3, 0);
    } else if (createTaxReportDto.period.includes("-")) {
      const [year, month] = createTaxReportDto.period.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Calculate tax based on invoices in period
    if (
      createTaxReportDto.type === TaxReportType.VAT ||
      createTaxReportDto.type === TaxReportType.SALES_TAX
    ) {
      const invoices = await this.invoiceModel.aggregate([
        {
          $match: {
            accountId: account._id,
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ["paid", "sent"] },
          },
        },
        {
          $group: {
            _id: null,
            totalVat: { $sum: "$totalVat" },
          },
        },
      ]);
      amount = invoices.length > 0 ? invoices[0].totalVat || 0 : 0;
    } else if (createTaxReportDto.type === TaxReportType.WITHHOLDING_TAX) {
      const invoices = await this.invoiceModel.aggregate([
        {
          $match: {
            accountId: account._id,
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ["paid", "sent"] },
          },
        },
        {
          $group: {
            _id: null,
            totalWHT: { $sum: "$totalWHT" },
          },
        },
      ]);
      amount = invoices.length > 0 ? invoices[0].totalWHT || 0 : 0;
    }

    // Calculate due date (typically end of following month for quarterly)
    const dueDate = new Date(endDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(dueDate.getDate() + 21); // 21 days after period end

    const taxReport = new this.taxReportModel({
      ...createTaxReportDto,
      accountId: account._id,
      createdBy: userId,
      amount,
      dueDate,
      status: TaxReportStatus.PENDING,
    });

    return taxReport.save();
  }

  async findAll(
    accountId: string,
    query: PaginationQuery & {
      type?: TaxReportType;
      status?: TaxReportStatus;
      period?: string;
      year?: number;
    }
  ): Promise<PaginatedResponse<TaxReport>> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      type,
      status,
      period,
      year,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = { accountId: account._id };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (period) {
      filter.period = { $regex: period, $options: "i" };
    }

    if (year) {
      filter.period = { $regex: year.toString(), $options: "i" };
    }

    const [reports, total] = await Promise.all([
      this.taxReportModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "firstName lastName email")
        .exec(),
      this.taxReportModel.countDocuments(filter).exec(),
    ]);

    return {
      data: reports,
      total,
    };
  }

  async findOne(id: string, accountId: string): Promise<TaxReport> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const report = await this.taxReportModel
      .findOne({ _id: id, accountId: account._id })
      .populate("createdBy", "firstName lastName email")
      .exec();

    if (!report) {
      throw new NotFoundException("Tax report not found");
    }

    return report;
  }

  async fileReport(
    id: string,
    fileDto: { filedDate?: string },
    accountId: string,
    userId: string
  ): Promise<TaxReport> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const report = await this.taxReportModel.findOne({
      _id: id,
      accountId: account._id,
    });

    if (!report) {
      throw new NotFoundException("Tax report not found");
    }

    return this.taxReportModel
      .findByIdAndUpdate(
        id,
        {
          status: TaxReportStatus.FILED,
          filedDate: fileDto.filedDate ? new Date(fileDto.filedDate) : new Date(),
        },
        { new: true }
      )
      .populate("createdBy", "firstName lastName email")
      .exec();
  }

  async payReport(
    id: string,
    payDto: { paidDate?: string },
    accountId: string,
    userId: string
  ): Promise<TaxReport> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const report = await this.taxReportModel.findOne({
      _id: id,
      accountId: account._id,
    });

    if (!report) {
      throw new NotFoundException("Tax report not found");
    }

    return this.taxReportModel
      .findByIdAndUpdate(
        id,
        {
          status: TaxReportStatus.PAID,
          paidDate: payDto.paidDate ? new Date(payDto.paidDate) : new Date(),
        },
        { new: true }
      )
      .populate("createdBy", "firstName lastName email")
      .exec();
  }

  async remove(id: string, accountId: string): Promise<void> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const report = await this.taxReportModel.findOne({
      _id: id,
      accountId: account._id,
    });

    if (!report) {
      throw new NotFoundException("Tax report not found");
    }

    await this.taxReportModel.findByIdAndDelete(id).exec();
  }

  async getStats(accountId: string, year?: number): Promise<any> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const accountObjectId = account._id;
    const targetYear = year || new Date().getFullYear();
    const yearRegex = new RegExp(targetYear.toString());

    // Get tax stats by type
    const typeStats = await this.taxReportModel.aggregate([
      {
        $match: {
          accountId: accountObjectId,
          period: { $regex: yearRegex },
        },
      },
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get status counts
    const statusStats = await this.taxReportModel.aggregate([
      {
        $match: {
          accountId: accountObjectId,
          period: { $regex: yearRegex },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate sales vs purchase tax from invoices
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31);

    const invoiceTaxStats = await this.invoiceModel.aggregate([
      {
        $match: {
          accountId: accountObjectId,
          createdAt: { $gte: startOfYear, $lte: endOfYear },
          status: { $in: ["paid", "sent"] },
        },
      },
      {
        $group: {
          _id: null,
          totalVat: { $sum: "$totalVat" },
          totalWHT: { $sum: "$totalWHT" },
        },
      },
    ]);

    const result = {
      totalSalesTaxCollected:
        invoiceTaxStats.length > 0 ? invoiceTaxStats[0].totalVat || 0 : 0,
      totalPurchaseTaxPaid: 0, // Would come from expenses
      netTaxLiability:
        invoiceTaxStats.length > 0 ? invoiceTaxStats[0].totalVat || 0 : 0,
      pendingFilings: 0,
      overdueFilings: 0,
    };

    statusStats.forEach((stat) => {
      if (stat._id === TaxReportStatus.PENDING) {
        result.pendingFilings = stat.count;
      } else if (stat._id === TaxReportStatus.OVERDUE) {
        result.overdueFilings = stat.count;
      }
    });

    return result;
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Payroll,
  PayrollDocument,
  PayrollStatus,
  PayFrequency,
} from "@/schemas/payroll.schema";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { CreatePayrollDto } from "@/models/dto/payroll/create-payroll.dto";
import { UpdatePayrollDto } from "@/models/dto/payroll/update-payroll.dto";
import { PaginationQuery, PaginatedResponse } from "@/common/types";

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(Payroll.name)
    private payrollModel: Model<PayrollDocument>,
    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>
  ) {}

  async create(
    createPayrollDto: CreatePayrollDto,
    accountId: string,
    userId: string
  ): Promise<Payroll> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Generate payroll number
    const lastPayroll = await this.payrollModel
      .findOne({ accountId: account._id })
      .sort({ createdAt: -1 })
      .exec();

    let payrollNumber = "PAY-00001";
    if (lastPayroll && lastPayroll.payrollNumber) {
      const lastNumber = parseInt(lastPayroll.payrollNumber.split("-")[1]);
      payrollNumber = `PAY-${(lastNumber + 1).toString().padStart(5, "0")}`;
    }

    // Calculate totals from items
    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let totalAllowances = 0;

    const processedItems = createPayrollDto.items.map((item) => {
      const itemAllowances = item.allowances || [];
      const itemDeductions = item.deductions || [];

      const totalItemAllowances = itemAllowances.reduce(
        (sum, a) => sum + a.amount,
        0
      );
      const totalItemDeductions = itemDeductions.reduce(
        (sum, d) => sum + d.amount,
        0
      );
      const grossPay = item.basicSalary + totalItemAllowances;
      const netPay = grossPay - totalItemDeductions;

      totalGrossPay += grossPay;
      totalDeductions += totalItemDeductions;
      totalNetPay += netPay;
      totalAllowances += totalItemAllowances;

      return {
        ...item,
        allowances: itemAllowances,
        deductions: itemDeductions,
        totalAllowances: totalItemAllowances,
        totalDeductions: totalItemDeductions,
        grossPay,
        netPay,
      };
    });

    const payroll = new this.payrollModel({
      ...createPayrollDto,
      items: processedItems,
      payrollNumber,
      accountId: account._id,
      createdBy: userId,
      payPeriodStart: new Date(createPayrollDto.payPeriodStart),
      payPeriodEnd: new Date(createPayrollDto.payPeriodEnd),
      payDate: new Date(createPayrollDto.payDate),
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      totalAllowances,
      employeeCount: processedItems.length,
    });

    return payroll.save();
  }

  async findAll(
    accountId: string,
    query: PaginationQuery & {
      status?: PayrollStatus;
      startDate?: string;
      endDate?: string;
      payFrequency?: PayFrequency;
    }
  ): Promise<PaginatedResponse<Payroll>> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "payPeriodStart",
      sortOrder = "desc",
      status,
      startDate,
      endDate,
      payFrequency,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = { accountId: account._id };

    if (search) {
      filter.$or = [{ payrollNumber: { $regex: search, $options: "i" } }];
    }

    if (status) {
      filter.status = status;
    }

    if (payFrequency) {
      filter.payFrequency = payFrequency;
    }

    if (startDate || endDate) {
      filter.payPeriodStart = {};
      if (startDate) {
        filter.payPeriodStart.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.payPeriodStart.$lte = new Date(endDate);
      }
    }

    const [payrolls, total] = await Promise.all([
      this.payrollModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "firstName lastName email")
        .populate("approvedBy", "firstName lastName email")
        .populate("items.staff", "firstName lastName email employeeId department position")
        .exec(),
      this.payrollModel.countDocuments(filter).exec(),
    ]);

    return {
      data: payrolls,
      total,
    };
  }

  async findOne(id: string, accountId: string): Promise<Payroll> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const payroll = await this.payrollModel
      .findOne({ _id: id, accountId: account._id })
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .populate("processedBy", "firstName lastName email")
      .populate("items.staff", "firstName lastName email employeeId department position")
      .exec();

    if (!payroll) {
      throw new NotFoundException("Payroll not found");
    }

    return payroll;
  }

  async update(
    id: string,
    updatePayrollDto: UpdatePayrollDto,
    accountId: string
  ): Promise<Payroll> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const payroll = await this.payrollModel.findOne({
      _id: id,
      accountId: account._id,
    });

    if (!payroll) {
      throw new NotFoundException("Payroll not found");
    }

    if (payroll.status === PayrollStatus.PAID) {
      throw new BadRequestException("Cannot update paid payroll");
    }

    const updateData: any = { ...updatePayrollDto };

    // Recalculate if items changed
    if (updatePayrollDto.items) {
      let totalGrossPay = 0;
      let totalDeductions = 0;
      let totalNetPay = 0;
      let totalAllowances = 0;

      const processedItems = updatePayrollDto.items.map((item) => {
        const itemAllowances = item.allowances || [];
        const itemDeductions = item.deductions || [];

        const totalItemAllowances = itemAllowances.reduce(
          (sum, a) => sum + a.amount,
          0
        );
        const totalItemDeductions = itemDeductions.reduce(
          (sum, d) => sum + d.amount,
          0
        );
        const grossPay = item.basicSalary + totalItemAllowances;
        const netPay = grossPay - totalItemDeductions;

        totalGrossPay += grossPay;
        totalDeductions += totalItemDeductions;
        totalNetPay += netPay;
        totalAllowances += totalItemAllowances;

        return {
          ...item,
          allowances: itemAllowances,
          deductions: itemDeductions,
          totalAllowances: totalItemAllowances,
          totalDeductions: totalItemDeductions,
          grossPay,
          netPay,
        };
      });

      updateData.items = processedItems;
      updateData.totalGrossPay = totalGrossPay;
      updateData.totalDeductions = totalDeductions;
      updateData.totalNetPay = totalNetPay;
      updateData.totalAllowances = totalAllowances;
      updateData.employeeCount = processedItems.length;
    }

    return this.payrollModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("createdBy", "firstName lastName email")
      .populate("items.staff", "firstName lastName email employeeId")
      .exec();
  }

  async updateStatus(
    id: string,
    status: PayrollStatus,
    accountId: string,
    userId: string
  ): Promise<Payroll> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const payroll = await this.payrollModel.findOne({
      _id: id,
      accountId: account._id,
    });

    if (!payroll) {
      throw new NotFoundException("Payroll not found");
    }

    const updateData: any = { status };

    if (status === PayrollStatus.APPROVED) {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    } else if (status === PayrollStatus.PROCESSING) {
      updateData.processedBy = userId;
      updateData.processedAt = new Date();
    }

    return this.payrollModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .exec();
  }

  async remove(id: string, accountId: string): Promise<void> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const payroll = await this.payrollModel.findOne({
      _id: id,
      accountId: account._id,
    });

    if (!payroll) {
      throw new NotFoundException("Payroll not found");
    }

    if (payroll.status === PayrollStatus.PAID) {
      throw new BadRequestException("Cannot delete paid payroll");
    }

    await this.payrollModel.findByIdAndDelete(id).exec();
  }

  async getStats(accountId: string): Promise<any> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const accountObjectId = account._id;

    // Get status stats
    const statusStats = await this.payrollModel.aggregate([
      { $match: { accountId: accountObjectId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$totalNetPay" },
        },
      },
    ]);

    // Get monthly trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTrend = await this.payrollModel.aggregate([
      {
        $match: {
          accountId: accountObjectId,
          payPeriodStart: { $gte: twelveMonthsAgo },
          status: PayrollStatus.PAID,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$payPeriodStart" },
            month: { $month: "$payPeriodStart" },
          },
          amount: { $sum: "$totalNetPay" },
          employeeCount: { $sum: "$employeeCount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Calculate totals
    const result = {
      total: 0,
      totalPaid: 0,
      pending: { count: 0, amount: 0 },
      processing: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      monthlyTrend: monthlyTrend.map((m) => ({
        month: `${m._id.year}-${m._id.month.toString().padStart(2, "0")}`,
        amount: m.amount,
        employeeCount: m.employeeCount,
      })),
      averagePayPerEmployee: 0,
    };

    let totalEmployees = 0;
    let totalPaidAmount = 0;

    statusStats.forEach((stat) => {
      result.total += stat.count;

      if (stat._id === PayrollStatus.PENDING) {
        result.pending = { count: stat.count, amount: stat.amount || 0 };
      } else if (stat._id === PayrollStatus.PROCESSING) {
        result.processing = { count: stat.count, amount: stat.amount || 0 };
      } else if (stat._id === PayrollStatus.PAID) {
        result.paid = { count: stat.count, amount: stat.amount || 0 };
        result.totalPaid = stat.amount || 0;
        totalPaidAmount = stat.amount || 0;
      }
    });

    // Calculate average pay per employee from paid payrolls
    const paidPayrolls = await this.payrollModel.aggregate([
      { $match: { accountId: accountObjectId, status: PayrollStatus.PAID } },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: "$employeeCount" },
          totalAmount: { $sum: "$totalNetPay" },
        },
      },
    ]);

    if (paidPayrolls.length > 0 && paidPayrolls[0].totalEmployees > 0) {
      result.averagePayPerEmployee =
        paidPayrolls[0].totalAmount / paidPayrolls[0].totalEmployees;
    }

    return result;
  }

  async findByPeriod(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<Payroll[]> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    return this.payrollModel
      .find({
        accountId: account._id,
        payPeriodStart: { $gte: new Date(startDate) },
        payPeriodEnd: { $lte: new Date(endDate) },
      })
      .populate("createdBy", "firstName lastName email")
      .populate("items.staff", "firstName lastName email employeeId")
      .exec();
  }
}

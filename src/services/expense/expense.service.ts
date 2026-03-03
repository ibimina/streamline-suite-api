import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Expense,
  ExpenseDocument,
  ExpenseStatus,
  ExpenseCategory,
} from "@/schemas/expense.schema";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { CreateExpenseDto } from "@/models/dto/expenses/create-expense.dto";
import { UpdateExpenseDto } from "@/models/dto/expenses/update-expense.dto";
import { PaginationQuery, PaginatedResponse } from "@/common/types";
import { ActivityService } from "../activity/activity.service";
import { ActivityType } from "@/models/enums/shared.enum";
import { InventoryTransactionService } from "../inventory-transaction/inventory-transaction.service";

@Injectable()
export class ExpenseService {
  constructor(
    @InjectModel(Expense.name)
    private expenseModel: Model<ExpenseDocument>,
    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,
    private readonly activityService: ActivityService,
    private readonly inventoryTransactionService: InventoryTransactionService,
  ) {}

  async create(
    createExpenseDto: CreateExpenseDto,
    accountId: string,
    userId: string,
  ): Promise<Expense> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Generate expense number
    const lastExpense = await this.expenseModel
      .findOne({ account: account._id })
      .sort({ createdAt: -1 })
      .exec();

    let expenseNumber = "EXP-00001";
    if (lastExpense && lastExpense.expenseNumber) {
      const lastNumber = parseInt(lastExpense.expenseNumber.split("-")[1]);
      expenseNumber = `EXP-${(lastNumber + 1).toString().padStart(5, "0")}`;
    }

    const expense = new this.expenseModel({
      ...createExpenseDto,
      items: (createExpenseDto.items || []).map((item) => ({
        ...item,
        lineTotal: item.quantity * item.unitCost,
      })),
      expenseNumber,
      account: account._id,
      createdBy: userId,
      date: new Date(createExpenseDto.date),
    });

    const savedExpense = await expense.save();

    // Log activity
    await this.activityService.create({
      type: ActivityType.EXPENSE_CREATED,
      title: "Expense created",
      description: `Expense ${savedExpense.expenseNumber} - ${savedExpense.description} recorded`,
      account: account._id as any,
      user: userId as any,
      entityId: savedExpense._id,
      entityType: "expense",
      metadata: {
        expenseNumber: savedExpense.expenseNumber,
        amount: savedExpense.amount,
        category: savedExpense.category,
        description: savedExpense.description,
      },
    });

    return savedExpense;
  }

  async findAll(
    accountId: string,
    query: PaginationQuery & {
      category?: ExpenseCategory;
      status?: ExpenseStatus;
      startDate?: string;
      endDate?: string;
      vendor?: string;
    },
  ): Promise<PaginatedResponse<Expense>> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "date",
      sortOrder = "desc",
      category,
      status,
      startDate,
      endDate,
      vendor,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = { account: account._id };

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { expenseNumber: { $regex: search, $options: "i" } },
        { reference: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (vendor) {
      filter.vendor = new Types.ObjectId(vendor);
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    const [expenses, total] = await Promise.all([
      this.expenseModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("vendor", "name email")
        .populate("createdBy", "firstName lastName email")
        .populate("approvedBy", "firstName lastName email")
        .populate("items.product", "name sku")
        .exec(),
      this.expenseModel.countDocuments(filter).exec(),
    ]);

    return {
      data: expenses,
      total,
    };
  }

  async findOne(id: string, accountId: string): Promise<Expense> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const expense = await this.expenseModel
      .findOne({ _id: id, account: account._id })
      .populate("vendor", "name email phone address")
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .populate("items.product", "name sku currentStock costPrice")
      .exec();

    if (!expense) {
      throw new NotFoundException("Expense not found");
    }

    return expense;
  }

  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
    accountId: string,
  ): Promise<Expense> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const expense = await this.expenseModel.findOne({
      _id: id,
      account: account._id,
    });

    if (!expense) {
      throw new NotFoundException("Expense not found");
    }

    if (expense.status === ExpenseStatus.PAID) {
      throw new BadRequestException("Cannot update paid expense");
    }

    const updateData: any = { ...updateExpenseDto };
    if (updateExpenseDto.date) {
      updateData.date = new Date(updateExpenseDto.date);
    }

    return this.expenseModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("vendor", "name email")
      .populate("createdBy", "firstName lastName email")
      .exec();
  }

  async updateStatus(
    id: string,
    status: ExpenseStatus,
    accountId: string,
    userId: string,
  ): Promise<Expense> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const expense = await this.expenseModel.findOne({
      _id: id,
      account: account._id,
    });

    if (!expense) {
      throw new NotFoundException("Expense not found");
    }

    const updateData: any = { status };

    if (status === ExpenseStatus.APPROVED) {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    }

    const previousStatus = expense.status;

    const updatedExpense = await this.expenseModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("vendor", "name email")
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .populate("items.product", "name sku trackInventory")
      .exec();

    // Create purchase inventory transactions when approved/paid (first time only)
    if (
      updatedExpense &&
      updatedExpense.items &&
      updatedExpense.items.length > 0
    ) {
      const isNowApprovedOrPaid =
        status === ExpenseStatus.APPROVED || status === ExpenseStatus.PAID;
      const wasNotApprovedOrPaid =
        previousStatus !== ExpenseStatus.APPROVED &&
        previousStatus !== ExpenseStatus.PAID;

      if (isNowApprovedOrPaid && wasNotApprovedOrPaid) {
        try {
          await this.inventoryTransactionService.createPurchaseTransactionsForExpense(
            updatedExpense.items as any[],
            updatedExpense.expenseNumber,
            updatedExpense._id.toString(),
            accountId,
            userId,
          );
        } catch (err) {
          console.error(
            `Failed to create purchase transactions for expense ${updatedExpense.expenseNumber}:`,
            err,
          );
        }
      }

      // Reverse inventory transactions when cancelled from approved/paid
      if (
        status === ExpenseStatus.CANCELLED &&
        (previousStatus === ExpenseStatus.APPROVED ||
          previousStatus === ExpenseStatus.PAID)
      ) {
        try {
          await this.inventoryTransactionService.reverseExpenseTransactions(
            updatedExpense._id.toString(),
            accountId,
            userId,
          );
        } catch (err) {
          console.error(
            `Failed to reverse transactions for expense ${updatedExpense.expenseNumber}:`,
            err,
          );
        }
      }
    }

    return updatedExpense;
  }

  async remove(id: string, accountId: string, userId?: string): Promise<void> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const expense = await this.expenseModel.findOne({
      _id: id,
      account: account._id,
    });

    if (!expense) {
      throw new NotFoundException("Expense not found");
    }

    if (expense.status === ExpenseStatus.PAID) {
      throw new BadRequestException("Cannot delete paid expense");
    }

    // Reverse inventory transactions if expense was approved with product items
    if (
      expense.status === ExpenseStatus.APPROVED &&
      expense.items &&
      expense.items.length > 0 &&
      userId
    ) {
      try {
        await this.inventoryTransactionService.reverseExpenseTransactions(
          expense._id.toString(),
          accountId,
          userId,
        );
      } catch (err) {
        console.error(
          `Failed to reverse transactions for deleted expense ${expense.expenseNumber}:`,
          err,
        );
      }
    }

    await this.expenseModel.findByIdAndDelete(id).exec();
  }

  async findByCategory(
    accountId: string,
    category: ExpenseCategory,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<Expense>> {
    return this.findAll(accountId, { ...query, category });
  }

  async getStats(accountId: string): Promise<any> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const accountObjectId = account._id;

    // Get status-based stats
    const statusStats = await this.expenseModel.aggregate([
      { $match: { account: accountObjectId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
    ]);

    // Get category-based stats
    const categoryStats = await this.expenseModel.aggregate([
      { $match: { account: accountObjectId } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    // Get monthly trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTrend = await this.expenseModel.aggregate([
      {
        $match: {
          account: accountObjectId,
          date: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Build result
    const result = {
      total: 0,
      totalAmount: 0,
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      byCategory: categoryStats.map((cat) => ({
        category: cat._id,
        count: cat.count,
        amount: cat.amount,
      })),
      monthlyTrend: monthlyTrend.map((m) => ({
        month: `${m._id.year}-${m._id.month.toString().padStart(2, "0")}`,
        amount: m.amount,
      })),
    };

    statusStats.forEach((stat) => {
      result.total += stat.count;
      result.totalAmount += stat.amount || 0;

      const statusKey = stat._id as keyof typeof result;
      if (
        statusKey === "pending" ||
        statusKey === "approved" ||
        statusKey === "paid" ||
        statusKey === "rejected"
      ) {
        result[statusKey] = {
          count: stat.count,
          amount: stat.amount || 0,
        };
      }
    });

    return result;
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  InventoryTransaction,
  InventoryTransactionDocument,
} from "@/schemas/inventory-transaction.schema";
import { Product, ProductDocument } from "@/schemas/product.schema";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { CreateInventoryTransactionDto } from "@/models/dto/inventory-transaction/create-inventory-transaction.dto";
import { UpdateInventoryTransactionDto } from "@/models/dto/inventory-transaction/update-inventory-transaction.dto";
import {
  PaginationQuery,
  PaginatedResponse,
  InventoryTransactionStatus,
} from "@/common/types";

@Injectable()
export class InventoryTransactionService {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private inventoryTransactionModel: Model<InventoryTransactionDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Account.name) private companyModel: Model<AccountDocument>,
  ) {}

  /**
   * Determine if a transaction status represents an inbound (stock increase) movement
   */
  private isInboundStatus(status: string): boolean {
    const inbound = [
      InventoryTransactionStatus.PURCHASE,
      InventoryTransactionStatus.RETURN_FROM_CUSTOMER,
      InventoryTransactionStatus.PRODUCTION_IN,
    ];
    return inbound.includes(status as InventoryTransactionStatus);
  }

  /**
   * Determine if a transaction status represents an outbound (stock decrease) movement
   */
  private isOutboundStatus(status: string): boolean {
    const outbound = [
      InventoryTransactionStatus.SALE,
      InventoryTransactionStatus.RETURN_TO_SUPPLIER,
      InventoryTransactionStatus.PRODUCTION_OUT,
    ];
    return outbound.includes(status as InventoryTransactionStatus);
  }

  async createInventoryTransaction(
    createInventoryTransactionDto: CreateInventoryTransactionDto,
    companyId: string,
    userId: string,
  ): Promise<InventoryTransaction> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Verify product belongs to the same account
    const product = await this.productModel
      .findOne({
        _id: createInventoryTransactionDto.product,
        account: account._id,
      })
      .exec();

    if (!product) {
      throw new NotFoundException("Product not found in your account");
    }

    // Generate transaction reference if not provided
    if (!createInventoryTransactionDto.reference) {
      const lastTransaction = await this.inventoryTransactionModel
        .findOne({ account: account._id })
        .sort({ createdAt: -1 })
        .exec();

      let nextNumber = 1;
      if (lastTransaction && lastTransaction.reference) {
        const match = lastTransaction.reference.match(/INV-T-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      createInventoryTransactionDto.reference = `INV-T-${nextNumber
        .toString()
        .padStart(5, "0")}`;
    }

    // Check for duplicate reference within account
    const existingTransaction = await this.inventoryTransactionModel.findOne({
      reference: createInventoryTransactionDto.reference,
      account: account._id,
    });
    if (existingTransaction) {
      throw new BadRequestException("Reference already exists in your account");
    }

    // Check if product tracks inventory
    if (!product.trackInventory) {
      throw new BadRequestException(
        "Cannot create stock transaction for product that doesn't track inventory",
      );
    }

    const txStatus = createInventoryTransactionDto.status;

    // Check sufficient stock for outbound transactions
    if (
      this.isOutboundStatus(txStatus) &&
      product.currentStock < createInventoryTransactionDto.quantity
    ) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.currentStock}, Required: ${createInventoryTransactionDto.quantity}`,
      );
    }

    // Calculate unit cost if not provided (for inbound transactions)
    if (
      this.isInboundStatus(txStatus) &&
      !createInventoryTransactionDto.unitCost
    ) {
      createInventoryTransactionDto.unitCost = product.costPrice || 0;
    }

    const transaction = new this.inventoryTransactionModel({
      ...createInventoryTransactionDto,
      account: account._id,
      createdBy: userId,
    });

    const savedTransaction = await transaction.save();
    return savedTransaction;
  }

  /**
   * Create inventory transactions for invoice items (called by InvoicesService).
   * Only creates transactions for items that reference a product with trackInventory: true.
   */
  async createSaleTransactionsForInvoice(
    invoiceItems: Array<{
      product?: any;
      description: string;
      quantity: number;
      unitCost?: number;
    }>,
    invoiceRef: string,
    invoiceId: string,
    accountId: string,
    userId: string,
  ): Promise<void> {
    const account = await this.companyModel.findById(accountId).exec();
    if (!account) return;

    for (const item of invoiceItems) {
      if (!item.product) continue; // Skip free-text items with no product link

      const productId =
        typeof item.product === "object"
          ? item.product._id || item.product
          : item.product;

      const product = await this.productModel
        .findOne({ _id: productId, account: account._id })
        .exec();

      if (!product || !product.trackInventory) continue;

      const transaction = new this.inventoryTransactionModel({
        product: product._id,
        status: InventoryTransactionStatus.SALE,
        quantity: item.quantity,
        unitCost: item.unitCost || product.costPrice || 0,
        reference: `Invoice ${invoiceRef}`,
        referenceId: invoiceId,
        account: account._id,
        createdBy: userId,
        notes: `Auto-created from invoice ${invoiceRef}`,
      });

      await transaction.save(); // post-save hook updates product.currentStock
    }
  }

  /**
   * Reverse inventory transactions for a cancelled/deleted invoice.
   * Creates return_from_customer transactions to restore stock.
   */
  async reverseInvoiceTransactions(
    invoiceId: string,
    accountId: string,
    userId: string,
  ): Promise<void> {
    const account = await this.companyModel.findById(accountId).exec();
    if (!account) return;

    // Find all sale transactions linked to this invoice
    const saleTransactions = await this.inventoryTransactionModel
      .find({
        referenceId: invoiceId,
        account: account._id,
        status: InventoryTransactionStatus.SALE,
      })
      .exec();

    for (const saleTx of saleTransactions) {
      // Create a return transaction to reverse each sale
      const reversal = new this.inventoryTransactionModel({
        product: saleTx.product,
        status: InventoryTransactionStatus.RETURN_FROM_CUSTOMER,
        quantity: saleTx.quantity,
        unitCost: saleTx.unitCost,
        reference: `Reversal of ${saleTx.reference}`,
        referenceId: invoiceId,
        account: account._id,
        createdBy: userId,
        notes: `Auto-reversal: invoice cancelled/deleted`,
      });

      await reversal.save(); // post-save hook recalculates stock
    }
  }

  /**
   * Create an initial stock (PURCHASE) transaction when a new product is created
   * with trackInventory enabled and currentStock > 0.
   */
  async createInitialStockTransaction(
    productId: string,
    quantity: number,
    unitCost: number,
    accountId: string,
    userId: string,
  ): Promise<void> {
    const transaction = new this.inventoryTransactionModel({
      product: new Types.ObjectId(productId),
      status: InventoryTransactionStatus.PURCHASE,
      quantity,
      unitCost,
      reference: "Initial stock",
      account: new Types.ObjectId(accountId),
      createdBy: new Types.ObjectId(userId),
      notes: "Auto-created: initial stock on product creation",
    });

    await transaction.save(); // post-save hook updates product.currentStock
  }

  /**
   * Create a stock adjustment transaction when a product's currentStock is
   * manually changed via product update.
   * Positive stockDiff → PURCHASE (inbound), negative → SALE (outbound).
   * We use PURCHASE/SALE rather than ADJUSTMENT so the post-save hook's
   * isPositive regex handles directionality correctly.
   */
  async createStockAdjustmentTransaction(
    productId: string,
    stockDiff: number,
    unitCost: number,
    accountId: string,
    userId: string,
  ): Promise<void> {
    const status =
      stockDiff > 0
        ? InventoryTransactionStatus.PURCHASE
        : InventoryTransactionStatus.SALE;

    const transaction = new this.inventoryTransactionModel({
      product: new Types.ObjectId(productId),
      status,
      quantity: Math.abs(stockDiff),
      unitCost,
      reference: `Stock adjustment (${stockDiff > 0 ? "+" : ""}${stockDiff})`,
      account: new Types.ObjectId(accountId),
      createdBy: new Types.ObjectId(userId),
      notes: `Auto-created: manual stock adjustment via product update`,
    });

    await transaction.save(); // post-save hook recalculates product.currentStock
  }

  /**
   * Create PURCHASE inventory transactions for expense items (called by ExpenseService).
   * Only creates transactions for items that reference a product with trackInventory: true.
   */
  async createPurchaseTransactionsForExpense(
    expenseItems: Array<{
      product?: any;
      description: string;
      quantity: number;
      unitCost?: number;
    }>,
    expenseRef: string,
    expenseId: string,
    accountId: string,
    userId: string,
  ): Promise<void> {
    const account = await this.companyModel.findById(accountId).exec();
    if (!account) return;

    for (const item of expenseItems) {
      if (!item.product) continue; // Skip items with no product link

      const productId =
        typeof item.product === "object"
          ? item.product._id || item.product
          : item.product;

      const product = await this.productModel
        .findOne({ _id: productId, account: account._id })
        .exec();

      if (!product || !product.trackInventory) continue;

      const transaction = new this.inventoryTransactionModel({
        product: product._id,
        status: InventoryTransactionStatus.PURCHASE,
        quantity: item.quantity,
        unitCost: item.unitCost || product.costPrice || 0,
        reference: `Expense ${expenseRef}`,
        referenceId: expenseId,
        account: account._id,
        createdBy: userId,
        notes: `Auto-created from expense ${expenseRef}`,
      });

      await transaction.save(); // post-save hook updates product.currentStock
    }
  }

  /**
   * Reverse inventory transactions for a cancelled/deleted expense.
   * Creates return_to_supplier transactions to undo the stock increase.
   */
  async reverseExpenseTransactions(
    expenseId: string,
    accountId: string,
    userId: string,
  ): Promise<void> {
    const account = await this.companyModel.findById(accountId).exec();
    if (!account) return;

    // Find all purchase transactions linked to this expense
    const purchaseTransactions = await this.inventoryTransactionModel
      .find({
        referenceId: expenseId,
        account: account._id,
        status: InventoryTransactionStatus.PURCHASE,
      })
      .exec();

    for (const purchaseTx of purchaseTransactions) {
      const reversal = new this.inventoryTransactionModel({
        product: purchaseTx.product,
        status: InventoryTransactionStatus.RETURN_TO_SUPPLIER,
        quantity: purchaseTx.quantity,
        unitCost: purchaseTx.unitCost,
        reference: `Reversal of ${purchaseTx.reference}`,
        referenceId: expenseId,
        account: account._id,
        createdBy: userId,
        notes: `Auto-reversal: expense cancelled/deleted`,
      });

      await reversal.save(); // post-save hook recalculates stock
    }
  }

  async findAllInventoryTransactions(
    companyId: string,
    query: PaginationQuery & {
      productId?: string;
      transactionType?: string;
      status?: string;
      warehouseId?: string;
    },
  ): Promise<{
    inventoryTransactions: InventoryTransaction[];
    total: number;
  }> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      productId,
      transactionType,
      status,
      warehouseId,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = { account: account._id };

    if (productId) {
      filter.product = productId;
    }

    if (transactionType || status) {
      filter.status = transactionType || status;
    }

    if (warehouseId) {
      filter.warehouse = warehouseId;
    }

    if (search) {
      filter.$or = [
        { reference: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const [transactions, total] = await Promise.all([
      this.inventoryTransactionModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("product", "name sku currentStock")
        .populate("warehouse", "name code")
        .populate("createdBy", "firstName lastName email")
        .exec(),
      this.inventoryTransactionModel.countDocuments(filter).exec(),
    ]);

    return {
      inventoryTransactions: transactions,
      total,
    };
  }

  async findByIdInventoryTransaction(
    id: string,
    companyId: string,
  ): Promise<InventoryTransaction> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const transaction = await this.inventoryTransactionModel
      .findOne({ _id: id, account: account._id })
      .populate("product", "name sku currentStock")
      .populate("warehouse", "name code")
      .populate("createdBy", "firstName lastName email")
      .exec();

    if (!transaction) {
      throw new NotFoundException("Inventory transaction not found");
    }

    return transaction;
  }

  async updateInventoryTransaction(
    id: string,
    updateInventoryTransactionDto: UpdateInventoryTransactionDto,
    companyId: string,
  ): Promise<InventoryTransaction> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const existingTransaction = await this.inventoryTransactionModel
      .findOne({ _id: id, account: account._id })
      .exec();

    if (!existingTransaction) {
      throw new NotFoundException("Inventory transaction not found");
    }

    // Check for duplicate reference if updating reference
    if (updateInventoryTransactionDto.reference) {
      const duplicateReference = await this.inventoryTransactionModel.findOne({
        reference: updateInventoryTransactionDto.reference,
        account: account._id,
        _id: { $ne: id },
      });
      if (duplicateReference) {
        throw new BadRequestException(
          "Reference already exists in your account",
        );
      }
    }

    const transaction = await this.inventoryTransactionModel
      .findByIdAndUpdate(id, updateInventoryTransactionDto, { new: true })
      .populate("product", "name sku currentStock")
      .populate("warehouse", "name code")
      .populate("createdBy", "firstName lastName email")
      .exec();

    return transaction!;
  }

  async removeInventoryTransaction(
    id: string,
    companyId: string,
  ): Promise<void> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const transaction = await this.inventoryTransactionModel
      .findOne({ _id: id, account: account._id })
      .exec();

    if (!transaction) {
      throw new NotFoundException("Inventory transaction not found");
    }

    // Prevent deletion of completed stock transactions
    if (transaction.status === InventoryTransactionStatus.COMPLETED) {
      throw new BadRequestException(
        "Cannot delete completed stock transactions as they affect inventory levels",
      );
    }

    await this.inventoryTransactionModel.findByIdAndDelete(id).exec();
  }

  async getInventoryTransactionHistory(
    productId: string,
    companyId: string,
  ): Promise<InventoryTransaction[]> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Verify product belongs to the same account
    const product = await this.productModel
      .findOne({ _id: productId, account: account._id })
      .exec();

    if (!product) {
      throw new NotFoundException("Product not found in your account");
    }

    return this.inventoryTransactionModel
      .find({
        product: new Types.ObjectId(productId),
        account: account._id,
      })
      .sort({ createdAt: -1 })
      .populate("warehouse", "name code")
      .populate("createdBy", "firstName lastName email")
      .exec();
  }

  async getInventoryTransactionStats(companyId: string): Promise<any> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const [totalTransactions, recentTransactions, transactionsByType] =
      await Promise.all([
        this.inventoryTransactionModel.countDocuments({
          account: account._id,
        }),
        this.inventoryTransactionModel.countDocuments({
          account: account._id,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        }),
        this.inventoryTransactionModel.aggregate([
          { $match: { account: account._id } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalValue: {
                $sum: { $multiply: ["$quantity", "$unitCost"] },
              },
            },
          },
        ]),
      ]);

    const typeStats = transactionsByType.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count,
        totalValue: curr.totalValue,
      };
      return acc;
    }, {});

    return {
      totalTransactions,
      recentTransactions,
      transactionsByType: typeStats,
    };
  }
}

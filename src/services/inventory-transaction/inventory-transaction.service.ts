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
    @InjectModel(Account.name) private companyModel: Model<AccountDocument>
  ) {}

  async create(
    createInventoryTransactionDto: CreateInventoryTransactionDto,
    companyId: string,
    userId: string
  ): Promise<InventoryTransaction> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Verify product belongs to the same account
    const product = await this.productModel
      .findOne({
        _id: createInventoryTransactionDto.product,
        companyId: account._id,
      })
      .exec();

    if (!product) {
      throw new NotFoundException("Product not found in your account");
    }

    // Generate transaction reference if not provided
    if (!createInventoryTransactionDto.reference) {
      const lastTransaction = await this.inventoryTransactionModel
        .findOne({ companyId: account._id })
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
      companyId: account._id,
    });
    if (existingTransaction) {
      throw new BadRequestException("Reference already exists in your account");
    }

    // Check if product tracks inventory for stock operations
    if (
      ["stock_in", "stock_out", "adjustment"].includes(product.status) &&
      !product.trackInventory
    ) {
      throw new BadRequestException(
        "Cannot create stock transaction for product that doesn't track inventory"
      );
    }

    // Check sufficient stock for out transactions
    if (
      product.status === "stock_out" &&
      product.currentStock < createInventoryTransactionDto.quantity
    ) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.currentStock}, Required: ${createInventoryTransactionDto.quantity}`
      );
    }

    // Calculate unit cost if not provided (for stock_in transactions)
    if (
      product.status === "stock_in" &&
      !createInventoryTransactionDto.unitCost
    ) {
      createInventoryTransactionDto.unitCost = product.costPrice || 0;
    }

    const transaction = new this.inventoryTransactionModel({
      ...createInventoryTransactionDto,
      companyId,
      createdBy: userId,
      status:
        InventoryTransactionStatus[
          createInventoryTransactionDto.status.toUpperCase()
        ],
    });

    const savedTransaction = await transaction.save();
    return savedTransaction;
  }

  async findAll(
    companyId: string,
    query: PaginationQuery & {
      productId?: string;
      transactionType?: string;
      status?: string;
      warehouseId?: string;
    }
  ): Promise<PaginatedResponse<InventoryTransaction>> {
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

    const filter: any = { companyId: account._id };

    if (productId) {
      filter.productId = productId;
    }

    if (transactionType) {
      filter.transactionType = transactionType;
    }

    if (status) {
      filter.status = status;
    }

    if (warehouseId) {
      filter.warehouseId = warehouseId;
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
        .populate("productId", "name sku currentStock")
        .populate("warehouseId", "name code")
        .populate("createdBy", "firstName lastName email")
        .exec(),
      this.inventoryTransactionModel.countDocuments(filter).exec(),
    ]);

    return {
      data: transactions,
      total,
    };
  }

  async findOne(id: string, companyId: string): Promise<InventoryTransaction> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const transaction = await this.inventoryTransactionModel
      .findOne({ _id: id, companyId: account._id })
      .populate("productId", "name sku currentStock")
      .populate("warehouseId", "name code")
      .populate("createdBy", "firstName lastName email")
      .exec();

    if (!transaction) {
      throw new NotFoundException("Inventory transaction not found");
    }

    return transaction;
  }

  async update(
    id: string,
    updateInventoryTransactionDto: UpdateInventoryTransactionDto,
    companyId: string
  ): Promise<InventoryTransaction> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const existingTransaction = await this.inventoryTransactionModel
      .findOne({ _id: id, companyId: account._id })
      .exec();

    if (!existingTransaction) {
      throw new NotFoundException("Inventory transaction not found");
    }

    // Prevent updates to completed transactions that affect stock
    // if (
    //   existingTransaction.status === InventoryTransactionStatus.COMPLETED &&
    //   (updateInventoryTransactionDto.quantity ||
    //     updateInventoryTransactionDto.movementType)
    // ) {
    //   throw new BadRequestException(
    //     "Cannot modify quantity or type of completed stock transactions"
    //   );
    // }

    // Check for duplicate reference if updating reference
    if (updateInventoryTransactionDto.reference) {
      const duplicateReference = await this.inventoryTransactionModel.findOne({
        reference: updateInventoryTransactionDto.reference,
        companyId: account._id,
        _id: { $ne: id },
      });
      if (duplicateReference) {
        throw new BadRequestException(
          "Reference already exists in your account"
        );
      }
    }

    const transaction = await this.inventoryTransactionModel
      .findByIdAndUpdate(id, updateInventoryTransactionDto, { new: true })
      .populate("productId", "name sku currentStock")
      .populate("warehouseId", "name code")
      .populate("createdBy", "firstName lastName email")
      .exec();

    return transaction!;
  }

  async remove(id: string, companyId: string): Promise<void> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const transaction = await this.inventoryTransactionModel
      .findOne({ _id: id, companyId: account._id })
      .exec();

    if (!transaction) {
      throw new NotFoundException("Inventory transaction not found");
    }

    // Prevent deletion of completed stock transactions
    if (transaction.status === InventoryTransactionStatus.COMPLETED) {
      throw new BadRequestException(
        "Cannot delete completed stock transactions as they affect inventory levels"
      );
    }

    await this.inventoryTransactionModel.findByIdAndDelete(id).exec();
  }

  async getTransactionHistory(
    productId: string,
    companyId: string
  ): Promise<InventoryTransaction[]> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Verify product belongs to the same account
    const product = await this.productModel
      .findOne({ _id: productId, companyId: account._id })
      .exec();

    if (!product) {
      throw new NotFoundException("Product not found in your account");
    }

    return this.inventoryTransactionModel
      .find({
        productId: new Types.ObjectId(productId),
        companyId: account._id,
      })
      .sort({ createdAt: -1 })
      .populate("warehouseId", "name code")
      .populate("createdBy", "firstName lastName email")
      .exec();
  }

  async getStats(companyId: string): Promise<any> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const [totalTransactions, recentTransactions, transactionsByType] =
      await Promise.all([
        this.inventoryTransactionModel.countDocuments({
          companyId: account._id,
        }),
        this.inventoryTransactionModel.countDocuments({
          companyId: account._id,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
        this.inventoryTransactionModel.aggregate([
          { $match: { companyId: account._id } },
          {
            $group: {
              _id: "$transactionType",
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

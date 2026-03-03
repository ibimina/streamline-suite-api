import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "@/schemas/product.schema";
import { CreateProductDto } from "@/models/dto/product/create-product.dto";
import { UpdateProductDto } from "@/models/dto/product/update-product.dto";
import { PaginationQuery, PaginatedResponse } from "@/common/types";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { ActivityService } from "../activity/activity.service";
import { ActivityType, ActivityPriority } from "@/models/enums/shared.enum";
import { InventoryTransactionService } from "../inventory-transaction/inventory-transaction.service";

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    private readonly activityService: ActivityService,
    private readonly inventoryTransactionService: InventoryTransactionService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    accountId: string,
    userId: string,
  ): Promise<Product> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Check for duplicate SKU within account
    if (createProductDto.sku) {
      const existingProduct = await this.productModel.findOne({
        sku: createProductDto.sku,
        account: account._id,
      });
      if (existingProduct) {
        throw new BadRequestException("SKU already exists in your account");
      }
    }

    // Auto-generate SKU if not provided
    if (!createProductDto.sku) {
      const lastProduct = await this.productModel
        .findOne({ account: account._id })
        .sort({ createdAt: -1 })
        .exec();

      let nextNumber = 1;
      if (lastProduct && lastProduct.sku) {
        const match = lastProduct.sku.match(/PRD-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      createProductDto.sku = `PRD-${nextNumber.toString().padStart(3, "0")}`;
    }

    const product = new this.productModel({
      ...createProductDto,
      account: account._id,
      createdBy: userId,
    });

    const savedProduct = await product.save();

    // Create initial stock transaction if trackInventory is enabled and initial stock > 0
    if (savedProduct.trackInventory && savedProduct.currentStock > 0) {
      try {
        await this.inventoryTransactionService.createInitialStockTransaction(
          savedProduct._id.toString(),
          savedProduct.currentStock,
          savedProduct.costPrice || 0,
          accountId,
          userId,
        );
      } catch (err) {
        console.error(
          `Failed to create initial stock transaction for product ${savedProduct.sku}:`,
          err,
        );
      }
    }

    // Log activity
    await this.activityService.create({
      type: ActivityType.PRODUCT_CREATED,
      title: "Product created",
      description: `Product ${savedProduct.name} (${savedProduct.sku}) created`,
      account: account._id as any,
      user: userId as any,
      entityId: savedProduct._id,
      entityType: "product",
      metadata: {
        productName: savedProduct.name,
        sku: savedProduct.sku,
        price: savedProduct.sellingPrice,
      },
    });

    return savedProduct;
  }

  async findAll(
    accountId: string,
    query: PaginationQuery,
  ): Promise<{
    products: Product[];
    total: number;
  }> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = { account: account._id };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "firstName lastName email")
        .populate("supplier", "name p")
        .populate("alternativeSuppliers", "name")
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      products,
      total,
    };
  }

  async findOne(id: string, accountId: string): Promise<Product> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const product = await this.productModel
      .findOne({ _id: id, account: account._id })
      .populate("createdBy", "firstName lastName email")
      .populate("supplier", "name")
      .populate("alternativeSuppliers", "name")
      .exec();

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    accountId: string,
    userId?: string,
  ): Promise<Product> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Check for duplicate SKU if updating SKU
    if (updateProductDto.sku) {
      const existingProduct = await this.productModel.findOne({
        sku: updateProductDto.sku,
        account: account._id,
        _id: { $ne: id }, // Exclude current product
      });
      if (existingProduct) {
        throw new BadRequestException("SKU already exists in your account");
      }
    }

    // Capture old stock before update for adjustment tracking
    const oldProduct = await this.productModel
      .findOne({ _id: id, account: account._id })
      .exec();

    if (!oldProduct) {
      throw new NotFoundException("Product not found");
    }

    const product = await this.productModel
      .findOneAndUpdate({ _id: id, account: account._id }, updateProductDto, {
        new: true,
      })
      .populate("createdBy", "firstName lastName email")
      .populate("supplier", "name")
      .populate("alternativeSuppliers", "name")
      .exec();

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Create adjustment transaction if stock changed and tracking is enabled
    if (
      product.trackInventory &&
      updateProductDto.currentStock !== undefined &&
      oldProduct.currentStock !== product.currentStock
    ) {
      const stockDiff = product.currentStock - (oldProduct.currentStock || 0);
      if (stockDiff !== 0) {
        try {
          await this.inventoryTransactionService.createStockAdjustmentTransaction(
            product._id.toString(),
            stockDiff,
            product.costPrice || 0,
            accountId,
            userId,
          );
        } catch (err) {
          console.error(
            `Failed to create stock adjustment for product ${product.sku}:`,
            err,
          );
        }
      }
    }

    // Log product updated activity
    await this.activityService.create({
      type: ActivityType.PRODUCT_UPDATED,
      title: "Product updated",
      description: `Product "${product.name}" was updated`,
      account: account._id,
      user: userId as any,
      entityId: product._id as any,
      entityType: "product",
      metadata: { productName: product.name, sku: product.sku },
    });

    // Check for low stock and log alert if needed
    if (
      product.currentStock !== undefined &&
      product.lowStockAlert !== undefined &&
      product.currentStock <= product.lowStockAlert
    ) {
      await this.activityService.create({
        type: ActivityType.PRODUCT_LOW_STOCK,
        title: "Low stock alert",
        description: `Product "${product.name}" is running low on stock (${product.currentStock} remaining)`,
        account: account._id,
        user: userId as any,
        entityId: product._id as any,
        entityType: "product",
        priority: ActivityPriority.HIGH,
        metadata: {
          productName: product.name,
          sku: product.sku,
          currentStock: product.currentStock,
          lowStockAlert: product.lowStockAlert,
        },
      });
    }

    return product;
  }

  async remove(id: string, accountId: string): Promise<void> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const result = await this.productModel
      .findOneAndDelete({ _id: id, account: account._id })
      .exec();

    if (!result) {
      throw new NotFoundException("Product not found");
    }
  }

  async getStats(accountId: string): Promise<any> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalValue,
    ] = await Promise.all([
      this.productModel.countDocuments({ account: account._id }),
      this.productModel.countDocuments({
        account: account._id,
        isActive: true,
      }),
      this.productModel.countDocuments({
        account: account._id,
        $expr: { $lte: ["$currentStock", "$lowStockAlert"] },
        isActive: true,
      }),
      this.productModel.countDocuments({
        account: account._id,
        currentStock: { $lte: 0 },
        trackInventory: true,
        isActive: true,
      }),
      this.productModel.aggregate([
        { $match: { account: account._id, isActive: true } },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: { $multiply: ["$currentStock", "$sellingPrice"] },
            },
          },
        },
      ]),
    ]);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue: totalValue[0]?.totalValue || 0,
    };
  }

  async getLowStockProducts(accountId: string): Promise<Product[]> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    return this.productModel
      .find({
        account: account._id,
        $expr: { $lte: ["$currentStock", "$lowStockAlert"] },
        trackInventory: true,
        isActive: true,
      })
      .sort({ currentStock: 1 })
      .limit(50)
      .exec();
  }
}

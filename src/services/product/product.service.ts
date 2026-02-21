import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Product, ProductDocument } from "@/schemas/product.schema";
import { CreateProductDto } from "@/models/dto/product/create-product.dto";
import { UpdateProductDto } from "@/models/dto/product/update-product.dto";
import { PaginationQuery, PaginatedResponse } from "@/common/types";
import { Account, AccountDocument } from "@/schemas/account.schema";

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Account.name) private companyModel: Model<AccountDocument>
  ) {}

  async create(
    createProductDto: CreateProductDto,
    companyId: string,
    userId: string
  ): Promise<Product> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Check for duplicate SKU within account
    if (createProductDto.sku) {
      const existingProduct = await this.productModel.findOne({
        sku: createProductDto.sku,
        companyId: account._id,
      });
      if (existingProduct) {
        throw new BadRequestException("SKU already exists in your account");
      }
    }

    // Auto-generate SKU if not provided
    if (!createProductDto.sku) {
      const lastProduct = await this.productModel
        .findOne({ companyId: account._id })
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
      companyId,
      createdBy: userId,
    });

    return product.save();
  }

  async findAll(
    companyId: string,
    query: PaginationQuery
  ): Promise<{
    products: Product[]
    total: number
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
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = { companyId: account._id };

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

  async findOne(id: string, companyId: string): Promise<Product> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const product = await this.productModel
      .findOne({ _id: id, companyId: account._id })
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
    companyId: string
  ): Promise<Product> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Check for duplicate SKU if updating SKU
    if (updateProductDto.sku) {
      const existingProduct = await this.productModel.findOne({
        sku: updateProductDto.sku,
        companyId: account._id,
        _id: { $ne: id }, // Exclude current product
      });
      if (existingProduct) {
        throw new BadRequestException("SKU already exists in your account");
      }
    }

    const product = await this.productModel
      .findOneAndUpdate({ _id: id, companyId: account._id }, updateProductDto, {
        new: true,
      })
      .populate("createdBy", "firstName lastName email")
      .populate("supplier", "name")
      .populate("alternativeSuppliers", "name")
      .exec();

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  async remove(id: string, companyId: string): Promise<void> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const result = await this.productModel
      .findOneAndDelete({ _id: id, companyId: account._id })
      .exec();

    if (!result) {
      throw new NotFoundException("Product not found");
    }
  }

  async getStats(companyId: string): Promise<any> {
    const account = await this.companyModel.findById(companyId).exec();
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
      this.productModel.countDocuments({ companyId: account._id }),
      this.productModel.countDocuments({
        companyId: account._id,
        isActive: true,
      }),
      this.productModel.countDocuments({
        companyId: account._id,
        $expr: { $lte: ["$currentStock", "$lowStockAlert"] },
        isActive: true,
      }),
      this.productModel.countDocuments({
        companyId: account._id,
        currentStock: { $lte: 0 },
        trackInventory: true,
        isActive: true,
      }),
      this.productModel.aggregate([
        { $match: { companyId: account._id, isActive: true } },
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

  async getLowStockProducts(companyId: string): Promise<Product[]> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    return this.productModel
      .find({
        companyId: account._id,
        $expr: { $lte: ["$currentStock", "$lowStockAlert"] },
        trackInventory: true,
        isActive: true,
      })
      .sort({ currentStock: 1 })
      .limit(50)
      .exec();
  }
}

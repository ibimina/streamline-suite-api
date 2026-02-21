import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Supplier, SupplierDocument } from "@/schemas/supplier.schema";
import { CreateSupplierDto } from "@/models/dto/supplier/create-supplier.dto";
import { UpdateSupplierDto } from "@/models/dto/supplier/update-supplier.dto";
import { PaginationQuery, PaginatedResponse } from "@/common/types";
import { Account, AccountDocument } from "@/schemas/account.schema";

@Injectable()
export class SupplierService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(Account.name) private companyModel: Model<AccountDocument>
  ) {}

  async createSupplier(
    createSupplierDto: CreateSupplierDto,
    companyId: string,
    userId: string
  ): Promise<Supplier> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Check for duplicate supplier name within account
    const existingSupplier = await this.supplierModel.findOne({
      name: createSupplierDto.name,
      companyId: account._id,
    });
    if (existingSupplier) {
      throw new BadRequestException(
        "Supplier name already exists in your account"
      );
    }

    // Check for duplicate email if provided
    if (createSupplierDto.email) {
      const existingEmail = await this.supplierModel.findOne({
        email: createSupplierDto.email,
        companyId: account._id,
      });
      if (existingEmail) {
        throw new BadRequestException("Email already exists in your account");
      }
    }

    const supplier = new this.supplierModel({
      ...createSupplierDto,
      companyId,
      createdBy: userId,
    });

    return supplier.save();
  }

  async findAllSuppliers(
    companyId: string,
    query: PaginationQuery
  ): Promise<{
    suppliers: Supplier[]
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
        { contact: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { taxId: { $regex: search, $options: "i" } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      this.supplierModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "firstName lastName email")
        .exec(),
      this.supplierModel.countDocuments(filter).exec(),
    ]);

    return {
       suppliers,
      total,
    };
  }

  async findSupplierById(id: string, companyId: string): Promise<Supplier> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const supplier = await this.supplierModel
      .findOne({ _id: id, companyId: account._id })
      .populate("createdBy", "firstName lastName email")
      .exec();

    if (!supplier) {
      throw new NotFoundException("Supplier not found");
    }

    return supplier;
  }

  async updateSupplier(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    companyId: string
  ): Promise<Supplier> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Check for duplicate name if updating name
    if (updateSupplierDto.name) {
      const existingSupplier = await this.supplierModel.findOne({
        name: updateSupplierDto.name,
        companyId: account._id,
        _id: { $ne: id }, // Exclude current supplier
      });
      if (existingSupplier) {
        throw new BadRequestException(
          "Supplier name already exists in your account"
        );
      }
    }

    // Check for duplicate email if updating email
    if (updateSupplierDto.email) {
      const existingEmail = await this.supplierModel.findOne({
        email: updateSupplierDto.email,
        companyId: account._id,
        _id: { $ne: id }, // Exclude current supplier
      });
      if (existingEmail) {
        throw new BadRequestException("Email already exists in your account");
      }
    }

    const supplier = await this.supplierModel
      .findOneAndUpdate(
        { _id: id, companyId: account._id },
        updateSupplierDto,
        { new: true }
      )
      .populate("createdBy", "firstName lastName email")
      .exec();

    if (!supplier) {
      throw new NotFoundException("Supplier not found");
    }

    return supplier;
  }

  async removeSupplier(id: string, companyId: string): Promise<void> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const result = await this.supplierModel
      .findOneAndDelete({ _id: id, companyId: account._id })
      .exec();

    if (!result) {
      throw new NotFoundException("Supplier not found");
    }
  }

  async getStats(companyId: string): Promise<any> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const [totalSuppliers, activeSuppliers] = await Promise.all([
      this.supplierModel.countDocuments({ companyId: account._id }),
      this.supplierModel.countDocuments({
        companyId: account._id,
        isActive: true,
      }),
    ]);

    return {
      totalSuppliers,
      activeSuppliers,
      inactiveSuppliers: totalSuppliers - activeSuppliers,
    };
  }

  async getActiveSuppliers(companyId: string): Promise<Supplier[]> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    return this.supplierModel
      .find({
        companyId: account._id,
        isActive: true,
      })
      .sort({ name: 1 })
      .select("_id name contact email phone")
      .exec();
  }
}

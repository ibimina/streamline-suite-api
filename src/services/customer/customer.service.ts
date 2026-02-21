import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateCustomerDto } from "@/models/dto/customer/create-customer.dto";
import { Customer, CustomerDocument } from "@/schemas/customer.schema";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { UpdateCustomerDto } from "@/models/dto/customer/update-customer.dto";

interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string; // e.g. 'createdAt' or '-createdAt'
}

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Account.name)
    private readonly companyModel: Model<AccountDocument>
  ) {}

  async createCustomer(
    createDto: CreateCustomerDto,
    companyId: string
  ): Promise<CustomerDocument> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found.");
    }
    const { email } = createDto as any;

    if (email) {
      const exists = await this.customerModel
        .findOne({ email: email.toLowerCase(), companyId })
        .lean();
      if (exists) {
        throw new ConflictException(
          "Customer with this email already exists for the account."
        );
      }
    }

    const created = new this.customerModel({
      ...createDto,
      email: createDto.email ? createDto.email.toLowerCase() : undefined,
    });

    return created.save();
  }

  async getAllCompanyCustomers(
    filter: Partial<Customer> = {},
    options: PaginationOptions = {},
    companyId: string
  ): Promise<{
    customers: CustomerDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Customer not found.");
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 25));
    const skip = (page - 1) * limit;
    const sort = options.sort || "-createdAt";

    const [customers, total] = await Promise.all([
      this.customerModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.customerModel.countDocuments(filter).exec(),
    ]);

    return { customers, total, page, limit };
  }

  async getCustomerById(
    id: string,
    companyId: string
  ): Promise<CustomerDocument> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Customer not found.");
    }

    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      throw new NotFoundException("Customer not found.");
    }
    return customer;
  }

  async update(
    id: string,
    updateDto: UpdateCustomerDto
  ): Promise<CustomerDocument> {
    const maybe = await this.customerModel.findById(id).exec();
    if (!maybe) {
      throw new NotFoundException("Customer not found.");
    }

    // If updating email, ensure uniqueness within account
    if ((updateDto as any).email) {
      const email = (updateDto as any).email.toLowerCase();
      const conflict = await this.customerModel
        .findOne({
          email,
          companyId: (maybe as any).companyId,
          _id: { $ne: id },
        })
        .lean();
      if (conflict) {
        throw new ConflictException(
          "Another customer with this email exists for the account."
        );
      }
      (updateDto as any).email = email;
    }

    Object.assign(maybe, updateDto);
    return maybe.save();
  }

  async deactivateCompanyCustomer(
    companyId: string,
    id: string
  ): Promise<void> {
    const res = await this.customerModel.findByIdAndDelete(id).exec();
    if (!res) {
      throw new NotFoundException("Customer not found.");
    }
  }
  async deleteCompanyCustomer(companyId: string, id: string): Promise<void> {
    const res = await this.customerModel.findByIdAndDelete(id).exec();
    if (!res) {
      throw new NotFoundException("Customer not found.");
    }
  }
}

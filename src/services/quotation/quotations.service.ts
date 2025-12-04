import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ObjectId } from "mongoose";
import { Quotation, QuotationDocument } from "@/schemas/quotation.schema";
import { CreateQuotationDto } from "@/models/dto/quotations/create-quotation.dto";
import { UpdateQuotationDto } from "@/models/dto/quotations/update-quotation.dto";
import {
  QuotationStatus,
  PaginationQuery,
  PaginatedResponse,
} from "@/common/types";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { BaseFinancialService } from "@/common/utils/financial-calculator";
import { Customer, CustomerDocument } from "@/schemas/customer.schema";

@Injectable()
export class QuotationsService extends BaseFinancialService {
  constructor(
    @InjectModel(Quotation.name)
    private quotationModel: Model<QuotationDocument>,
    @InjectModel(Account.name)
    private companyModel: Model<AccountDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>
  ) {
    super();
  }

  async create(
    createQuotationDto: CreateQuotationDto,
    companyId: ObjectId,
    userId: string
  ): Promise<Quotation> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Verify customer exists
    const customer = await this.customerModel
      .findById(createQuotationDto.customer)
      .exec();

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    // Generate quotation number
    const lastQuotation = await this.quotationModel
      .findOne({ companyId: account._id })
      .sort({ createdAt: -1 })
      .exec();

    let quotationNumber = "QUOT-001";
    if (lastQuotation) {
      const lastNumber = parseInt(lastQuotation.quotationNumber.split("-")[1]);
      quotationNumber = `QUOT-${(lastNumber + 1).toString().padStart(3, "0")}`;
    }

    // Enhanced financial calculations with profit tracking
    const financials = this.processInvoiceFinancials(createQuotationDto.items);

    const quotation = new this.quotationModel({
      ...createQuotationDto,
      ...financials,
      quotationNumber,
      companyId,
      createdBy: userId,
    });
    return quotation.save();
  }

  async findAll(
    companyId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<Quotation>> {
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
      // Search in quotation number or populate customer name/email
      filter.$or = [{ quotationNumber: { $regex: search, $options: "i" } }];
    }

    const [quotations, total] = await Promise.all([
      this.quotationModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "firstName lastName email")
        .populate("customer", "name email phone")
        .exec(),
      this.quotationModel.countDocuments(filter).exec(),
    ]);

    return {
      data: quotations,
      total,
    };
  }

  async findOne(id: string, companyId: string): Promise<Quotation> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const quotation = await this.quotationModel
      .findOne({ _id: id, companyId: account._id })
      .populate("createdBy", "firstName lastName email")
      .populate("customer", "name email phone address taxId")
      .populate("items.product", "name description")
      .exec();

    if (!quotation) {
      throw new NotFoundException("Quotation not found");
    }

    return quotation;
  }

  async update(
    id: string,
    updateQuotationDto: UpdateQuotationDto,
    companyId: string
  ): Promise<Quotation> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const quotation = await this.quotationModel.findOne({
      _id: id,
      companyId: account._id,
    });

    if (!quotation) {
      throw new NotFoundException("Quotation not found");
    }

    if (
      quotation.status === QuotationStatus.ACCEPTED ||
      quotation.convertedToInvoice
    ) {
      throw new BadRequestException(
        "Cannot update accepted or converted quotation"
      );
    }

    let updateData: any = { ...updateQuotationDto };
    let financials = {};

    if (updateQuotationDto.items) {
      // Recalculate financials with new items
      financials = this.processQuotationFinancials(updateQuotationDto.items);

      updateData = {
        ...updateData,
        ...financials,
      };
    }

    return this.quotationModel
      .findByIdAndUpdate(id, updateData)
      .populate("createdBy", "firstName lastName email")
      .populate("customer", "name email phone")
      .exec();
  }

  async remove(id: string, companyId: string): Promise<void> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const quotation = await this.quotationModel.findOne({
      _id: id,
      companyId: account._id,
    });

    if (
      quotation.status === QuotationStatus.ACCEPTED ||
      quotation.convertedToInvoice
    ) {
      throw new BadRequestException(
        "Cannot delete accepted or converted quotation"
      );
    }

    await this.quotationModel.findByIdAndDelete(id).exec();
  }

  async updateStatus(
    id: string,
    status: QuotationStatus,
    companyId: string
  ): Promise<Quotation> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    const updateData: any = { status };

    // Set status-specific dates
    if (status === QuotationStatus.SENT) {
      updateData.sentDate = new Date();
    } else if (status === QuotationStatus.ACCEPTED) {
      updateData.acceptedDate = new Date();
    } else if (status === QuotationStatus.REJECTED) {
      updateData.rejectedDate = new Date();
    }

    return this.quotationModel
      .findOneAndUpdate({ _id: id, companyId: account._id }, updateData, {
        new: true,
      })
      .populate("createdBy", "firstName lastName email")
      .populate("customer", "name email")
      .exec();
  }

  async getStats(companyId: string): Promise<any> {
    const stats = await this.quotationModel.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$grandTotal" },
          totalProfit: { $sum: "$expectedProfit" },
        },
      },
    ]);

    const result = {
      total: 0,
      totalValue: 0,
      totalExpectedProfit: 0,
      draft: { count: 0, amount: 0, profit: 0 },
      sent: { count: 0, amount: 0, profit: 0 },
      accepted: { count: 0, amount: 0, profit: 0 },
      rejected: { count: 0, amount: 0, profit: 0 },
      expired: { count: 0, amount: 0, profit: 0 },
    };

    stats.forEach((stat) => {
      result.total += stat.count;
      result.totalValue += stat.totalAmount || 0;
      result.totalExpectedProfit += stat.totalProfit || 0;

      const statusKey = stat._id.toLowerCase();
      if (result[statusKey]) {
        result[statusKey] = {
          count: stat.count,
          amount: stat.totalAmount || 0,
          profit: stat.totalProfit || 0,
        };
      }
    });

    return result;
  }

  async convertToInvoice(id: string, companyId: string): Promise<any> {
    const quotation = await this.findOne(id, companyId);

    if (quotation.status !== QuotationStatus.ACCEPTED) {
      throw new BadRequestException(
        "Only accepted quotations can be converted to invoices"
      );
    }

    if (quotation.convertedToInvoice) {
      throw new BadRequestException(
        "Quotation has already been converted to invoice"
      );
    }

    // This would typically create an invoice and link it
    // For now, just mark as converted
    return this.quotationModel
      .findByIdAndUpdate(id, { convertedToInvoice: true }, { new: true })
      .populate("createdBy", "firstName lastName email")
      .populate("customer", "name email")
      .exec();
  }
}

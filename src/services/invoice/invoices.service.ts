import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Invoice, InvoiceDocument } from "@/schemas/invoice.schema";
import { CreateInvoiceDto } from "@/models/dto/invoices/create-invoice.dto";
import { UpdateInvoiceDto } from "@/models/dto/invoices/update-invoice.dto";
import {
  InvoiceStatus,
  PaginationQuery,
  PaginatedResponse,
} from "@/common/types";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { BaseFinancialService } from "@/common/utils/financial-calculator";

@Injectable()
export class InvoicesService extends BaseFinancialService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Account.name) private companyModel: Model<AccountDocument>
  ) {
    super();
  }

  async create(
    createInvoiceDto: CreateInvoiceDto,
    companyId: string,
    userId: string
  ): Promise<Invoice> {
    // Generate invoice number

    const account = await this.companyModel.findById(companyId).exec();

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const lastInvoice = await this.invoiceModel
      .findOne({ companyId: account._id })
      .sort({ createdAt: -1 })
      .exec();

    let invoiceNumber = "INV-001";
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-")[1]);
      invoiceNumber = `INV-${(lastNumber + 1).toString().padStart(3, "0")}`;
    }

    const financials = this.processInvoiceFinancials(createInvoiceDto.items);

    const invoice = new this.invoiceModel({
      ...createInvoiceDto,
      ...financials,
      invoiceNumber,
      companyId,
      createdBy: userId,
    });

    return invoice.save();
  }

  async findAll(
    companyId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<Invoice>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const account = await this.companyModel.findById(companyId).exec();

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const skip = (page - 1) * limit;

    const filter: any = { companyId: account._id };

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
        { clientEmail: { $regex: search, $options: "i" } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    return {
      data: invoices,
      total,
    };
  }

  async findOne(id: string, companyId: string): Promise<Invoice> {
    const account = await this.companyModel.findById(companyId).exec();

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const invoice = await this.invoiceModel
      .findOne({ _id: id, companyId: account._id })
      .populate("createdBy", "name email")
      .exec();

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    return invoice;
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    companyId: string
  ): Promise<Invoice> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const invoice = await this.invoiceModel
      .findOne({ _id: id, companyId: account._id })
      .exec();

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException("Cannot update paid invoice");
    }

    let financials = {};

    if (updateInvoiceDto.items) {
      financials = this.processInvoiceFinancials(updateInvoiceDto.items);
    }

    return this.invoiceModel
      .findByIdAndUpdate(id, { ...updateInvoiceDto, ...financials })
      .populate("createdBy", "name email")
      .exec();
  }

  async remove(id: string, companyId: string): Promise<void> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const invoice = await this.invoiceModel
      .findOne({ _id: id, companyId: account._id })
      .exec();
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException("Cannot delete paid invoice");
    }

    await this.invoiceModel.findByIdAndDelete(invoice._id).exec();
  }

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    companyId: string
  ): Promise<Invoice> {
    const account = await this.companyModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const invoice = await this.invoiceModel
      .findOne({ _id: id, companyId: account._id })
      .exec();
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    const updateData: Partial<Invoice> = { status };

    // Set status-specific dates
    if (status === InvoiceStatus.SENT) {
      updateData.sentDate = new Date();
    } else if (status === InvoiceStatus.PAID) {
      updateData.paidDate = new Date();
    }

    return await this.invoiceModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async getStats(companyId: string): Promise<any> {
    const stats = await this.invoiceModel.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
    ]);

    const result = {
      total: 0,
      draft: { count: 0, amount: 0 },
      sent: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    };

    stats.forEach((stat) => {
      result.total += stat.count;
      result[stat._id.toLowerCase()] = {
        count: stat.count,
        amount: stat.totalAmount,
      };
    });

    return result;
  }
}

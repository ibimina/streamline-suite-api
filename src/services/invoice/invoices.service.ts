import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Invoice, InvoiceDocument } from "@/schemas/invoice.schema";
import { Quotation, QuotationDocument } from "@/schemas/quotation.schema";
import { CreateInvoiceDto } from "@/models/dto/invoices/create-invoice.dto";
import { UpdateInvoiceDto } from "@/models/dto/invoices/update-invoice.dto";
import {
  InvoiceStatus,
  QuotationStatus,
  PaginationQuery,
  PaginatedResponse,
} from "@/common/types";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { BaseFinancialService } from "@/common/utils/financial-calculator";

@Injectable()
export class InvoicesService extends BaseFinancialService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Quotation.name)
    private quotationModel: Model<QuotationDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {
    super();
  }

  async create(
    createInvoiceDto: CreateInvoiceDto,
    accountId: string,
    userId: string,
  ): Promise<Invoice> {
    // Generate invoice number

    const account = await this.accountModel.findById(accountId).exec();

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Validate and link quotation if provided
    let linkedQuotation: QuotationDocument | null = null;
    if (createInvoiceDto.quotation) {
      linkedQuotation = await this.quotationModel
        .findOne({
          _id: createInvoiceDto.quotation,
          account: account._id,
        })
        .exec();

      if (!linkedQuotation) {
        throw new NotFoundException("Quotation not found");
      }

      if (linkedQuotation.convertedToInvoice) {
        throw new BadRequestException(
          "Quotation has already been converted to an invoice",
        );
      }
    }

    const lastInvoice = await this.invoiceModel
      .findOne({ account: account._id })
      .sort({ createdAt: -1 })
      .exec();

    let uniqueId = "INV-001";
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.uniqueId.split("-")[1]);
      uniqueId = `INV-${(lastNumber + 1).toString().padStart(3, "0")}`;
    }

    const financials = this.processInvoiceFinancials(createInvoiceDto.items);
    const processedItems = financials.items.map((item, index) => ({
      ...item,
      description: createInvoiceDto.items[index].description || "",
      product: createInvoiceDto.items[index].product,
    }));

    const invoice = new this.invoiceModel({
      ...createInvoiceDto,
      ...financials,
      items: processedItems,
      uniqueId,
      account: account._id,
      quotation: linkedQuotation?._id || null,
      createdBy: userId,
    });

    const savedInvoice = await invoice.save();

    // Mark quotation as converted if linked
    if (linkedQuotation) {
      await this.quotationModel.findByIdAndUpdate(linkedQuotation._id, {
        convertedToInvoice: true,
        status: QuotationStatus.ACCEPTED,
      });
    }

    return savedInvoice;
  }

  /**
   * Get quotations available for linking (not yet converted)
   */
  async getAvailableQuotationsForLinking(
    accountId: string,
    customerId?: string,
  ): Promise<Quotation[]> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const filter: any = {
      account: account._id,
      convertedToInvoice: { $ne: true },
      status: { $nin: [QuotationStatus.REJECTED, QuotationStatus.EXPIRED] },
    };

    // Filter by customer if provided
    if (customerId) {
      filter.customer = new Types.ObjectId(customerId);
    }

    return this.quotationModel
      .find(filter)
      .populate("customer", "companyName email")
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async findAll(
    accountId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<Invoice>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const account = await this.accountModel.findById(accountId).exec();

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const skip = (page - 1) * limit;

    const filter: any = { account: account._id };

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
        .populate("createdBy", "firstName lastName email")
        .populate("customer", "companyName email phone billingAddress")
        .exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    return {
      data: invoices,
      total,
    };
  }

  async findOne(id: string, accountId: string): Promise<Invoice> {
    const account = await this.accountModel.findById(accountId).exec();

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const invoice = await this.invoiceModel
      .findOne({ _id: id, account: account._id })
      .populate("createdBy", "name email")
      .populate("customer", "companyName email phone billingAddress taxId")
      .populate({
        path: "items.product",
        select: "name description sku sellingPrice costPrice",
      })
      .exec();

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    return invoice;
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    accountId: string,
  ): Promise<Invoice> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const invoice = await this.invoiceModel
      .findOne({ _id: id, account: account._id })
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

  async remove(id: string, accountId: string): Promise<void> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const invoice = await this.invoiceModel
      .findOne({ _id: id, account: account._id })
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
    accountId: string,
  ): Promise<Invoice> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const invoice = await this.invoiceModel
      .findOne({ _id: id, account: account._id })
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

  async getStats(accountId: string): Promise<any> {
    const stats = await this.invoiceModel.aggregate([
      { $match: { accountId } },
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

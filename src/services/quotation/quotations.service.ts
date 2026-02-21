import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ObjectId, Types } from "mongoose";
import { Quotation, QuotationDocument } from "@/schemas/quotation.schema";
import { Invoice, InvoiceDocument } from "@/schemas/invoice.schema";
import { CreateQuotationDto } from "@/models/dto/quotations/create-quotation.dto";
import { UpdateQuotationDto } from "@/models/dto/quotations/update-quotation.dto";
import {
  QuotationStatus,
  InvoiceStatus,
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
    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
  ) {
    super();
  }

  async create(
    createQuotationDto: CreateQuotationDto,
    accountId: ObjectId,
    userId: string,
  ): Promise<Quotation> {
    const account = await this.accountModel.findById(accountId).exec();
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
      .findOne({ account: account._id })
      .sort({ createdAt: -1 })
      .exec();

    let uniqueId = "QUOT-001";
    if (lastQuotation) {
      const lastNumber = parseInt(lastQuotation.uniqueId.split("-")[1]);
      uniqueId = `QUOT-${(lastNumber + 1).toString().padStart(3, "0")}`;
    }

    // Enhanced financial calculations with profit tracking (including WHT)
    const whtRate = createQuotationDto.whtRate || 0;
    const financials = this.processQuotationFinancials(
      createQuotationDto.items,
      whtRate,
    );

    // Map items to include description from DTO
    const processedItems = financials.items.map((item, index) => ({
      ...item,
      description: createQuotationDto.items[index].description || "",
      product: createQuotationDto.items[index].product,
    }));

    const quotation = new this.quotationModel({
      ...createQuotationDto,
      ...financials,
      items: processedItems,
      whtRate,
      uniqueId,
      account: account._id,
      createdBy: userId,
    });
    return quotation.save();
  }

  async findAll(
    accountId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<Quotation>> {
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
      // Search in quotation number or populate customer name/email
      filter.$or = [{ uniqueId: { $regex: search, $options: "i" } }];
    }

    const [quotations, total] = await Promise.all([
      this.quotationModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "firstName lastName email")
        .populate("customer", "companyName email phone billingAddress")
        .exec(),
      this.quotationModel.countDocuments(filter).exec(),
    ]);

    return {
      data: quotations,
      total,
    };
  }

  async findOne(id: string, accountId: string): Promise<Quotation> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const quotation = await this.quotationModel
      .findOne({ _id: id, account: account._id })
      .populate("createdBy", "firstName lastName email")
      .populate("customer", "companyName email phone billingAddress taxId")
      .populate({
        path: "items.product",
        select: "name description sku sellingPrice costPrice",
      })
      .exec();

    if (!quotation) {
      throw new NotFoundException("Quotation not found");
    }

    return quotation;
  }

  async update(
    id: string,
    updateQuotationDto: UpdateQuotationDto,
    accountId: string,
  ): Promise<Quotation> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const quotation = await this.quotationModel.findOne({
      _id: id,
      account: account._id,
    });

    if (!quotation) {
      throw new NotFoundException("Quotation not found");
    }

    if (
      quotation.status === QuotationStatus.ACCEPTED ||
      quotation.convertedToInvoice
    ) {
      throw new BadRequestException(
        "Cannot update accepted or converted quotation",
      );
    }

    let updateData: any = { ...updateQuotationDto };

    if (updateQuotationDto.items) {
      // Recalculate financials with new items (including WHT)
      const whtRate = updateQuotationDto.whtRate ?? quotation.whtRate ?? 0;
      const financials = this.processQuotationFinancials(
        updateQuotationDto.items,
        whtRate,
      );
      const processedItems = financials.items.map((item, index) => ({
        ...item,
        description: updateQuotationDto.items[index].description || "",
        product: updateQuotationDto.items[index].product,
      }));

      updateData = {
        ...updateData,
        ...financials,
        items: processedItems,
        whtRate,
      };
    } else if (
      updateQuotationDto.whtRate !== undefined &&
      updateQuotationDto.whtRate !== quotation.whtRate
    ) {
      // WHT rate changed but items didn't - recalculate with existing items
      const whtRate = updateQuotationDto.whtRate;
      const financials = this.processQuotationFinancials(
        quotation.items as any,
        whtRate,
      );

      updateData = {
        ...updateData,
        ...financials,
        whtRate,
      };
    }

    return this.quotationModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("createdBy", "firstName lastName email")
      .populate("customer", "companyName email phone")
      .exec();
  }

  async remove(id: string, accountId: string): Promise<void> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const quotation = await this.quotationModel.findOne({
      _id: id,
      account: account._id,
    });

    if (
      quotation.status === QuotationStatus.ACCEPTED ||
      quotation.convertedToInvoice
    ) {
      throw new BadRequestException(
        "Cannot delete accepted or converted quotation",
      );
    }

    await this.quotationModel.findByIdAndDelete(id).exec();
  }

  async updateStatus(
    id: string,
    status: QuotationStatus,
    accountId: string,
  ): Promise<Quotation> {
    const account = await this.accountModel.findById(accountId).exec();
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
      .findOneAndUpdate({ _id: id, account: account._id }, updateData, {
        new: true,
      })
      .populate("createdBy", "firstName lastName email")
      .populate("customer", "name email")
      .exec();
  }

  async getStats(account: string): Promise<any> {
    const stats = await this.quotationModel.aggregate([
      { $match: { account } },
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

  async convertToInvoice(
    id: string,
    accountId: string,
    userId?: string,
  ): Promise<{ invoice: Invoice; quotation: Quotation }> {
    const quotation = await this.findOne(id, accountId);

    if (!quotation) {
      throw new NotFoundException("Quotation not found");
    }

    // Allow conversion from accepted OR sent status
    if (
      quotation.status !== QuotationStatus.ACCEPTED &&
      quotation.status !== QuotationStatus.SENT
    ) {
      throw new BadRequestException(
        "Only accepted or sent quotations can be converted to invoices",
      );
    }

    if (quotation.convertedToInvoice) {
      throw new BadRequestException(
        "Quotation has already been converted to invoice",
      );
    }

    // Generate invoice number
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
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

    // Map quotation items to invoice items
    const invoiceItems = quotation.items.map((item) => ({
      product: item.product,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent || 0,
      discountAmount: item.discountAmount || 0,
      vatRate: item.vatRate || 0,
      vatAmount: item.vatAmount || 0,
      unitCost: item.unitCost || 0,
      totalCost: (item.quantity || 0) * (item.unitCost || 0),
      lineTotal: item.lineTotal || 0,
      lineTotalInclVat: item.lineTotal || 0,
      whtAmount: item.whtAmount || 0,
      netReceivable: item.netReceivable || 0,
      grossProfit: item.grossProfit || 0,
      netProfit: item.netProfit || 0,
    }));

    // Calculate due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create the invoice
    const invoice = new this.invoiceModel({
      account: quotation.account,
      uniqueId,
      quotation: quotation._id,
      customer: quotation.customer,
      items: invoiceItems,
      status: InvoiceStatus.DRAFT,
      issuedDate: new Date(),
      dueDate,
      whtRate: quotation.whtRate || 0,
      notes: quotation.notes,
      terms: quotation.terms,
      template: quotation.template,
      templateId: quotation.templateId,
      accentColor: quotation.accentColor,
      // Financial totals from quotation
      subtotal: quotation.subtotal,
      totalDiscount: quotation.totalDiscount,
      totalVat: quotation.totalVat,
      totalWht: quotation.totalWht,
      grandTotal: quotation.grandTotal,
      netReceivable: quotation.netReceivable,
      totalCost: quotation.totalCost,
      expectedGrossProfit: quotation.expectedGrossProfit,
      expectedNetProfit: quotation.expectedNetProfit,
      expectedGrossProfitMargin: quotation.expectedGrossProfitMargin,
      expectedNetProfitMargin: quotation.expectedNetProfitMargin,
      expectedProfit: quotation.expectedProfit,
      expectedProfitMargin: quotation.expectedProfitMargin,
      // Payment tracking
      amountPaid: 0,
      balanceDue: quotation.netReceivable || quotation.grandTotal,
      createdBy: userId || quotation.createdBy,
    });

    const savedInvoice = await invoice.save();

    // Update quotation to mark as converted
    const updatedQuotation = await this.quotationModel
      .findByIdAndUpdate(
        id,
        {
          convertedToInvoice: true,
          status: QuotationStatus.ACCEPTED,
        },
        { new: true },
      )
      .populate("createdBy", "firstName lastName email")
      .populate("customer", "companyName email phone")
      .exec();

    return {
      invoice: savedInvoice,
      quotation: updatedQuotation,
    };
  }
}

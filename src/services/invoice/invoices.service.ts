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
import { Customer, CustomerDocument } from "@/schemas/customer.schema";
import { BaseFinancialService } from "@/common/utils/financial-calculator";
import { ActivityService } from "../activity/activity.service";
import { ActivityType } from "@/models/enums/shared.enum";
import { InventoryTransactionService } from "../inventory-transaction/inventory-transaction.service";

@Injectable()
export class InvoicesService extends BaseFinancialService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Quotation.name)
    private quotationModel: Model<QuotationDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private readonly activityService: ActivityService,
    private readonly inventoryTransactionService: InventoryTransactionService,
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

    // Log activity
    await this.activityService.create({
      type: ActivityType.INVOICE_CREATED,
      title: "Invoice created",
      description: `Invoice ${savedInvoice.uniqueId} created`,
      account: account._id,
      user: userId as any,
      entityId: savedInvoice._id,
      entityType: "invoice",
      metadata: {
        invoiceId: savedInvoice.uniqueId,
        amount: savedInvoice.grandTotal,
      },
    });

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

  async remove(id: string, accountId: string, userId?: string): Promise<void> {
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

    // Reverse inventory if invoice had stock deducted (was Sent or Overdue)
    if (
      [InvoiceStatus.SENT, InvoiceStatus.OVERDUE].includes(
        invoice.status as InvoiceStatus,
      )
    ) {
      try {
        await this.inventoryTransactionService.reverseInvoiceTransactions(
          invoice._id.toString(),
          accountId,
          userId || invoice.createdBy?.toString(),
        );
      } catch (err) {
        console.error(
          `Failed to reverse inventory for deleted invoice ${invoice.uniqueId}:`,
          err,
        );
      }
    }

    await this.invoiceModel.findByIdAndDelete(invoice._id).exec();
  }

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    accountId: string,
    userId?: string,
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

    const previousStatus = invoice.status;
    const updateData: Partial<Invoice> = { status };

    // Set status-specific dates
    if (status === InvoiceStatus.SENT) {
      updateData.sentDate = new Date();
    } else if (status === InvoiceStatus.PAID) {
      updateData.paidDate = new Date();
    }

    const updatedInvoice = await this.invoiceModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    // Deduct stock when invoice is Sent or Paid (only if stock wasn't already deducted)
    const stockAlreadyDeducted = [
      InvoiceStatus.SENT,
      InvoiceStatus.PAID,
      InvoiceStatus.OVERDUE,
    ].includes(previousStatus as InvoiceStatus);

    if (
      (status === InvoiceStatus.SENT || status === InvoiceStatus.PAID) &&
      !stockAlreadyDeducted
    ) {
      try {
        await this.inventoryTransactionService.createSaleTransactionsForInvoice(
          invoice.items,
          invoice.uniqueId,
          invoice._id.toString(),
          accountId,
          userId || invoice.createdBy?.toString(),
        );
      } catch (err) {
        console.error(
          `Failed to create inventory transactions for invoice ${invoice.uniqueId}:`,
          err,
        );
      }
    }

    // Reverse stock when invoice is Cancelled (if it was previously Sent/Paid/Overdue)
    if (
      status === InvoiceStatus.CANCELLED &&
      [InvoiceStatus.SENT, InvoiceStatus.PAID, InvoiceStatus.OVERDUE].includes(
        previousStatus as InvoiceStatus,
      )
    ) {
      try {
        await this.inventoryTransactionService.reverseInvoiceTransactions(
          invoice._id.toString(),
          accountId,
          userId || invoice.createdBy?.toString(),
        );
      } catch (err) {
        console.error(
          `Failed to reverse inventory for cancelled invoice ${invoice.uniqueId}:`,
          err,
        );
      }
    }

    // Log activity for status changes
    if (status === InvoiceStatus.SENT) {
      await this.activityService.create({
        type: ActivityType.INVOICE_SENT,
        title: "Invoice sent",
        description: `Invoice ${invoice.uniqueId} was sent to customer`,
        account: account._id,
        user: userId as any,
        entityId: invoice._id as any,
        entityType: "invoice",
        metadata: { invoiceId: invoice.uniqueId, amount: invoice.grandTotal },
      });
    } else if (status === InvoiceStatus.PAID) {
      await this.activityService.create({
        type: ActivityType.INVOICE_PAID,
        title: "Invoice paid",
        description: `Invoice ${invoice.uniqueId} has been paid`,
        account: account._id,
        user: userId as any,
        entityId: invoice._id as any,
        entityType: "invoice",
        metadata: { invoiceId: invoice.uniqueId, amount: invoice.grandTotal },
      });
    }

    return updatedInvoice;
  }

  async getStats(
    accountId: string,
    filters?: { startDate?: string; endDate?: string; customerId?: string },
  ): Promise<any> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Build dynamic match filter
    const matchFilter: Record<string, any> = { account: account._id };

    if (filters?.startDate || filters?.endDate) {
      matchFilter.createdAt = {};
      if (filters.startDate) {
        matchFilter.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchFilter.createdAt.$lte = new Date(filters.endDate);
      }
    }

    if (filters?.customerId) {
      matchFilter.customer = new Types.ObjectId(filters.customerId);
    }

    const [stats, topCustomers] = await Promise.all([
      // Status breakdown
      this.invoiceModel.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$grandTotal" },
            totalGrossProfit: { $sum: "$totalGrossProfit" },
            totalNetProfit: { $sum: "$totalNetProfit" },
          },
        },
      ]),

      // Top customers by invoice value
      this.invoiceModel.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: "$customer",
            totalRevenue: { $sum: "$grandTotal" },
            invoiceCount: { $sum: 1 },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "Paid"] }, "$grandTotal", 0],
              },
            },
            outstandingAmount: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["Sent", "Overdue", "Partial"]] },
                  {
                    $cond: [
                      { $gt: ["$balanceDue", 0] },
                      "$balanceDue",
                      "$grandTotal",
                    ],
                  },
                  0,
                ],
              },
            },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Populate customer details using Mongoose (same mechanism as .populate())
    const customerIds = topCustomers.map((c) => c._id);
    const customerDocs = await this.customerModel
      .find({ _id: { $in: customerIds } })
      .select("companyName fullName email")
      .lean()
      .exec();
    const customerMap = new Map(customerDocs.map((c) => [c._id.toString(), c]));

    const result = {
      total: 0,
      totalValue: 0,
      totalGrossProfit: 0,
      totalNetProfit: 0,
      draft: { count: 0, amount: 0 },
      sent: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
      topCustomers: topCustomers.map((c) => {
        const cust = customerMap.get(c._id.toString());
        return {
          customerId: c._id,
          companyName:
            cust?.companyName || cust?.fullName || "Unknown Customer",
          email: cust?.email || "",
          totalRevenue: c.totalRevenue,
          invoiceCount: c.invoiceCount,
          paidAmount: c.paidAmount,
          outstandingAmount: c.outstandingAmount,
        };
      }),
    };

    stats.forEach((stat) => {
      result.total += stat.count;
      result.totalValue += stat.totalAmount || 0;
      result.totalGrossProfit += stat.totalGrossProfit || 0;
      result.totalNetProfit += stat.totalNetProfit || 0;
      const statusKey = stat._id?.toLowerCase();
      if (statusKey && result[statusKey] !== undefined) {
        result[statusKey] = {
          count: stat.count,
          amount: stat.totalAmount || 0,
        };
      }
    });

    return result;
  }
}

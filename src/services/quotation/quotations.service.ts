import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Quotation, QuotationDocument } from "@/schemas/quotation.schema";
import { CreateQuotationDto } from "@/models/dto/quotations/create-quotation.dto";
import { UpdateQuotationDto } from "@/models/dto/quotations/update-quotation.dto";
import {
  QuotationStatus,
  PaginationQuery,
  PaginatedResponse,
} from "@/common/types";
import { Company, CompanyDocument } from "@/schemas/company.schema";
import {
  FinancialCalculator,
  BaseFinancialService,
} from "@/common/utils/financial-calculator";

@Injectable()
export class QuotationsService extends BaseFinancialService {
  constructor(
    @InjectModel(Quotation.name)
    private quotationModel: Model<QuotationDocument>,
    @InjectModel(Company.name)
    private companyModel: Model<CompanyDocument>
  ) {
        super();

  }

  async create(
    createQuotationDto: CreateQuotationDto,
    companyId: string,
    userId: string
  ): Promise<Quotation> {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    // Generate quotation number
    const lastQuotation = await this.quotationModel
      .findOne({ companyId: company._id })
      .sort({ createdAt: -1 })
      .exec();

    let quotationNumber = "QUOT-001";
    if (lastQuotation) {
      const lastNumber = parseInt(lastQuotation.quotationNumber.split("-")[1]);
      quotationNumber = `QUOT-${(lastNumber + 1).toString().padStart(3, "0")}`;
    }

       const financials = this.processFinancialCalculations(
      createQuotationDto.items,
      createQuotationDto.discount || 0
    );
    // Calculate totals
    const subtotal = createQuotationDto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );


    const quotation = new this.quotationModel({
      ...createQuotationDto,
      quotationNumber,
      companyId,
      createdBy: userId,
       // Use server-calculated values only
      subtotal: financials.subtotal,
      taxAmount: financials.taxAmount,
      discountAmount: financials.discountAmount,
      total: financials.total,
    });

    return quotation.save();
  }

  async findAll(
    companyId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<Quotation>> {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = { companyId: company._id };

    if (search) {
      filter.$or = [
        { quotationNumber: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
        { clientEmail: { $regex: search, $options: "i" } },
      ];
    }

    const [quotations, total] = await Promise.all([
      this.quotationModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .exec(),
      this.quotationModel.countDocuments(filter).exec(),
    ]);

    return {
      data: quotations,
      total,
    };
  }

  async findOne(id: string, companyId: string): Promise<Quotation> {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    const quotation = await this.quotationModel
      .findOne({ _id: id, companyId: company._id })
      .populate("createdBy", "name email")
      .populate("invoiceId")
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
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    const quotation = await this.quotationModel.findOne({
      _id: id,
      companyId: company._id,
    });

    if (
      quotation.status === QuotationStatus.ACCEPTED ||
      quotation.convertedToInvoice
    ) {
      throw new BadRequestException(
        "Cannot update accepted or converted quotation"
      );
    }

    let subtotal: number;
    let taxAmount: number;
    let discountAmount: number;
    let total: number;

    if (updateQuotationDto.items) {
      const financials = this.processFinancialCalculations(
        updateQuotationDto.items,
        updateQuotationDto.discount || 0
      );
      // Update with calculated values
      subtotal = financials.subtotal;
      taxAmount = financials.taxAmount;
      discountAmount = financials.discountAmount;
      total = financials.total;
    }

    return this.quotationModel
      .findByIdAndUpdate(id, { subtotal, taxAmount, discountAmount, total, ...updateQuotationDto })
      .populate("createdBy", "name email")
      .exec();
  }

  async remove(id: string, companyId: string): Promise<void> {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    const quotation = await this.quotationModel.findOne({
      _id: id,
      companyId: company._id,
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
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException("Company not found");
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
      .findOneAndUpdate({ _id: id, companyId: company._id }, updateData)
      .populate("createdBy", "name email")
      .exec();
  }

  async getStats(companyId: string): Promise<any> {
    const stats = await this.quotationModel.aggregate([
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
      accepted: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      expired: { count: 0, amount: 0 },
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
    quotation.convertedToInvoice = true;

    return this.quotationModel
      .findByIdAndUpdate(id, { convertedToInvoice: true }, { new: true })
      .populate("createdBy", "name email")
      .exec();
  }
}

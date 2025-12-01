import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateCompanyDto } from "@/models/dto/companies/company.dto";
import { Company, CompanyDocument } from "@/schemas/company.schema";
import { UpdateCompanyDto } from "@/models/dto/companies/update-company.dto";
import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";


@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  async getStats(companyId: string): Promise<any> {
    // Placeholder implementation - replace with actual logic
    const totalInvoices = await this.companyModel
      .countDocuments({ _id: companyId })
      .exec();
    const totalClients = 42; // Replace with actual client count logic
    const totalRevenue = 100000; // Replace with actual revenue calculation logic
    return {
      totalInvoices,
      totalClients,
      totalRevenue,
    };
  }

  async create(
    createCompanyDto: CreateCompanyDto,
    userId: string
  ): Promise<Company> {
    const company = new this.companyModel({
      ...createCompanyDto,
      ownerId: userId,
    });

    return company.save();
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyModel.findById(id).exec();

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    return company;
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
    userId: string
  ): Promise<Company> {
    const company = await this.companyModel.findById(id).exec();

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    Object.assign(company, updateCompanyDto);
    return company.save();
  }

  async uploadLogo(
    uploadFileDto: UploadFileDto,
    companyId: string
  ): Promise<any> {
    const company = await this.companyModel.findById(companyId).exec();

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    const result = await this.cloudinaryService.uploadImage(uploadFileDto);

    await this.companyModel.findByIdAndUpdate(companyId, {
      logoUrl: result.secure_url,
      publicId: result.public_id,
    });
    return;
  }

  async deleteLogo(id: string, userId: string): Promise<any> {
    const company = await this.companyModel.findById(id).exec();
   // Check permissions
    if (company.ownerId.toString() !== userId) {
      throw new ForbiddenException(
        "You do not have permission to update this company"
      );
    }

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    await this.cloudinaryService.deleteImage(company.publicId);

    company.logoUrl = undefined;
    company.publicId = undefined;
    return company.save();
  }
}

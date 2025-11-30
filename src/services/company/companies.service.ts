import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomUUID } from "crypto";
import { CreateCompanyDto, UpdateCompanyDto } from "@/models/dto/companies/company.dto";
import { Company, CompanyDocument } from "@/schemas/company.schema";


@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
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

    // Check if user owns the company
    if (company.ownerId.toString() !== userId) {
      throw new ForbiddenException(
        "You do not have permission to update this company"
      );
    }

    Object.assign(company, updateCompanyDto);
    return company.save();
  }

  async uploadLogo(
    id: string,
    file: Express.Multer.File,
    userId: string
  ): Promise<any> {
    const company = await this.companyModel.findById(id).exec();

    // Check permissions
    // if (company.ownerId.toString() !== userId) {
    //   throw new ForbiddenException(
    //     "You do not have permission to update this company"
    //   );
    // }

    // try {
    //   // Process and save the image
    //   const processedPath = await this.fileUploadService.processImage(
    //     file.path,
    //     {
    //       width: 400,
    //       height: 400,
    //       quality: 90,
    //     }
    //   );

    //   // Delete old logo if exists
    //   if (company.logoPath) {
    //     this.fileUploadService.deleteFile(company.logoPath);
    //   }

    //   // Update company with new logo paths
    //   company.logoPath = processedPath;
    //   company.logoUrl = this.fileUploadService.generatePublicUrl(processedPath);

    //   return company.save();
    // } catch (error) {
    //   // Clean up uploaded file on error
    //   if (file.path) {
    //     this.fileUploadService.deleteFile(file.path);
    //   }
    //   throw error;
    // }
  }

  async deleteLogo(id: string, userId: string): Promise<any> {
    const company = await this.companyModel.findById(id).exec();

    // Check permissions
    // if (company.ownerId.toString() !== userId) {
    //   throw new ForbiddenException(
    //     "You do not have permission to update this company"
    //   );
    // }

    // // Delete logo file
    // if (company.logoPath) {
    //   this.fileUploadService.deleteFile(company.logoPath);
    // }

    // // Update company
    // company.logoPath = undefined;
    // company.logoUrl = undefined;

    // return company.save();
  }

}

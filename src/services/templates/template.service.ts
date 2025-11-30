import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { Model } from "mongoose";
import { TemplateDocument } from "@/schemas/template.schema";
import { randomUUID } from "crypto";
import { CompanyDocument } from "@/schemas/company.schema";
import { NotFoundException } from "@nestjs/common";

export class TemplateService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly templateModel: Model<TemplateDocument>,
    private readonly companyModel: Model<CompanyDocument>
  ) {}
  async uploadTemplate(uploadFileDto: UploadFileDto, companyId: string) {
    try {
      const company = await this.companyModel.findById(companyId).exec();

      if (!company) {
        throw new NotFoundException("Company not found");
      }
      const result = await this.cloudinaryService.uploadImage(uploadFileDto);

      const { name, description } = uploadFileDto;
      const alphaNumeric = randomUUID();
      const uniqueId = `TEMP-${alphaNumeric}`;

      const template = await this.templateModel.create({
        imageUrl: result.secure_url,
        publicId: result.public_id,
        uniqueId,
        name,
        description,
        company: company._id,
      });
    
        await this.companyModel.findByIdAndUpdate(
          company._id,
          { $push: { templates: template._id } },
          { new: true }
        ).exec();

      return result;
    } catch (error) {
      throw new Error(`Failed to upload template`);
    }
  }

  async getAllTemplates(companyId: string) {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException("Company not found");
    }
    const templates = await this.templateModel
      .find({ company: company._id })
      .exec();
    return templates;
  }

  async deleteTemplate(companyId: string, id: string) {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    const template = await this.templateModel.findById(id).exec();
    if (!template) {
      throw new NotFoundException("Template not found");
    }

    await this.cloudinaryService.deleteImage(template.publicId);

    await this.templateModel.findByIdAndDelete(id).exec();
  }
}

import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { Model } from "mongoose";
import { Template, TemplateDocument } from "@/schemas/template.schema";
import { randomUUID } from "crypto";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class TemplateService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @InjectModel(Template.name) private readonly templateModel: Model<TemplateDocument>,
    @InjectModel(Account.name) private readonly accountModel: Model<AccountDocument>
  ) {}
  async uploadTemplate(uploadFileDto: UploadFileDto, companyId: string) {
    try {
      const account = await this.accountModel.findById(companyId).exec();

      if (!account) {
        throw new NotFoundException("Account not found");
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
        account: account._id,
      });

      await this.accountModel
        .findByIdAndUpdate(
          account._id,
          { $push: { templates: template._id } },
          { new: true }
        )
        .exec();

      return result;
    } catch (error) {
      throw new Error(`Failed to upload template`);
    }
  }

  async getAllTemplates(companyId: string) {
    const account = await this.accountModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    const templates = await this.templateModel
      .find({ account: account._id })
      .exec();
    return templates;
  }

  async deleteTemplate(companyId: string, id: string) {
    const account = await this.accountModel.findById(companyId).exec();
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const template = await this.templateModel.findById(id).exec();
    if (!template) {
      throw new NotFoundException("Template not found");
    }

    await this.cloudinaryService.deleteImage(template.publicId);

    await this.templateModel.findByIdAndDelete(id).exec();
  }
}

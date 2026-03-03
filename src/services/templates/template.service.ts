import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { Model } from "mongoose";
import { Template, TemplateDocument } from "@/schemas/template.schema";
import { randomUUID } from "crypto";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @InjectModel(Template.name)
    private readonly templateModel: Model<TemplateDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
  ) {}
  async uploadTemplate(uploadFileDto: UploadFileDto, accountId: string) {
    try {
      this.logger.log(`Starting template upload for account: ${accountId}`);
      this.logger.log(
        `DTO received: name=${uploadFileDto.name}, hasFile=${!!uploadFileDto.file}`,
      );

      const account = await this.accountModel.findById(accountId).exec();

      if (!account) {
        this.logger.error(`Account not found: ${accountId}`);
        throw new NotFoundException("Account not found");
      }

      this.logger.log(`Account found, uploading to Cloudinary...`);
      const result = await this.cloudinaryService.uploadImage(uploadFileDto);
      this.logger.log(`Cloudinary upload successful: ${result.secure_url}`);

      const { name, description } = uploadFileDto;
      const alphaNumeric = randomUUID();
      const uniqueId = `TEMP-${alphaNumeric}`;

      this.logger.log(`Creating template in database...`);
      const template = await this.templateModel.create({
        imageUrl: result.secure_url,
        publicId: result.public_id,
        uniqueId,
        name,
        description,
        account: account._id,
      });
      this.logger.log(`Template created: ${template._id}`);

      await this.accountModel
        .findByIdAndUpdate(
          account._id,
          { $push: { templates: template._id } },
          { new: true },
        )
        .exec();

      return {
        ...result,
        template: {
          _id: template._id,
          uniqueId: template.uniqueId,
          name: template.name,
          description: template.description,
          imageUrl: template.imageUrl,
        },
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to upload template: ${err.message}`);
      this.logger.error(err.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to upload template: ${err.message}`);
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

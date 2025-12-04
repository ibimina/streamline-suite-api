import { Roles } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";
import { UserRole } from "@/common/types";
import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";
import { TemplateService } from "@/services/templates/template.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("templates")
@Controller("templates")
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post("")
  @ApiOperation({ summary: "Create a new template upload" })
  async uploadTemplate(
    @Req() req: Request & { user: { accountId: string } },
    @Body() uploadFileDto: UploadFileDto
  ) {
    try {
      const result = await this.templateService.uploadTemplate(
        uploadFileDto,
        req.user.accountId
      );
      if (result) {
        return {
          payload: result,
          message: "Template uploaded successfully",
          status: HttpStatus.OK,
        };
      }
      return undefined;
    } catch (error) {
      console.error(
        `Error occured in Template Controller in - uploadTemplate`,
        JSON.stringify(error)
      );
      throw error;
    }
  }

  @Get("")
  @ApiOperation({ summary: "Get all templates for a account" })
  async getAllTemplates(@Req() req: Request & { user: { accountId: string } }) {
    try {
      const templates = await this.templateService.getAllTemplates(
        req.user.accountId
      );
      if (templates) {
        return {
          payload: templates,
          message: "Templates fetched successfully",
          status: HttpStatus.OK,
        };
      }
      return undefined;
    } catch (error) {
      console.error(
        "Error occured in Template Controller in - getAllTemplates",
        JSON.stringify(error)
      );
      throw error;
    }
  }

  @Delete(":id")
  @ApiOperation({ summary: "" })
  async deleteTemplates(
    @Req() req: Request & { user: { accountId: string } },
    id: string
  ) {
    try {
      await this.templateService.deleteTemplate(req.user.accountId, id);
      return {
        message: "Template deletion successful",
      };
    } catch (error) {
      console.error(
        "Error occured in Template Controller in - deleteTemplates",
        JSON.stringify(error)
      );
      throw error;
    }
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
} from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { UserRole } from "@/common/types";
import { RolesGuard } from "@/common/guards/roles.guard";
import { CompaniesService } from "@/services/company/companies.service";
import { UpdateCompanyDto } from "@/models/dto/companies/update-company.dto";
import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";

@ApiTags("companies")
@Controller("companies")
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService
  ) {}

  @Get("stats")
  @ApiOperation({ summary: "Get company statistics" })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getStats(@Req() req: Request & { user: { companyId: string } }) {
    return await this.companiesService.getStats(req.user.companyId.toString());
  }

  @Get(":id")
  @ApiOperation({ summary: "Get company by ID" })
  async findOne(@Param("id") id: string) {
    return await this.companiesService.findOne(id);
  }

  @Put("")
  @ApiOperation({ summary: "Update company" })
  async update(
    @Body() updateCompanyDto: UpdateCompanyDto,
    @Req() req: Request & { user: { id: string, companyId: string } },
  ) {
    return this.companiesService.update(req.user.companyId, updateCompanyDto, req.user.id);
  }


 @Post("")
  @ApiOperation({ summary: "Upload company logo" })
  async uploadLogo(
    @Req() req: Request & { user: { id: string; companyId: string } },
    @Body() uploadFileDto: UploadFileDto
  ) {
    try {
      const result = await this.companiesService.uploadLogo(
        uploadFileDto,
        req.user.companyId
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
  @Delete("")
  @ApiOperation({ summary: "Delete company logo" })
  async deleteLogo(@Req() req: Request & { user: { id: string; companyId: string } }) {
    try {
      const result = await this.companiesService.deleteLogo(
        req.user.id,
        req.user.companyId
      );
      if (result) {
        return {
          payload: result,
          message: "Company logo deleted successfully",
          status: HttpStatus.OK,
        };
      }
      return undefined;
    } catch (error) {
      console.error(
        `Error occured in Companies Controller in - deleteLogo`,
        JSON.stringify(error)
      );
      throw error;
    }
  }
}
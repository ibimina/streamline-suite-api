import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";

import {
  UpdateCompanyDto,
} from "@/models/dto/companies/company.dto";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { UserRole } from "@/common/types";
import { RolesGuard } from "@/common/guards/roles.guard";
import { CompaniesService } from "@/services/company/companies.service";

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

  @Put(":id")
  @ApiOperation({ summary: "Update company" })
  async update(
    @Param("id") id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @GetUser("id") userId: string
  ) {
    return this.companiesService.update(id, updateCompanyDto, userId);
  }

  @Post(":id/logo")
  @ApiOperation({ summary: "Upload company logo" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Company logo image",
    type: "multipart/form-data",
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file", {}))
  async uploadLogo(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser("id") userId: string
  ) {
    return this.companiesService.uploadLogo(id, file, userId);
  }

  @Delete(":id/logo")
  @ApiOperation({ summary: "Delete company logo" })
  async deleteLogo(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.companiesService.deleteLogo(id, userId);
  }

}

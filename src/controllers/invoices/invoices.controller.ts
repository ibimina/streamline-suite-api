import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { InvoicesService } from "@/services/invoice/invoices.service";
import { CreateInvoiceDto } from "@/models/dto/invoices/create-invoice.dto";
import {
  UpdateInvoiceDto,
  UpdateInvoiceStatusDto,
} from "@/models/dto/invoices/update-invoice.dto";
import { Roles } from "@/common/decorators/roles.decorator";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { UserRole, PaginationQuery } from "@/common/types";
import { User } from "@/schemas/user.schema";
import { RolesGuard } from "@/common/guards/roles.guard";

@ApiTags("invoices")
@Controller("invoices")
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new invoice" })
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Req() req: Request & { user: { id: string; companyId: string } }
  ) {
    try {
      const user = req.user;
      await this.invoicesService.create(
        createInvoiceDto,
        user.companyId.toString(),
        user.id
      );
      return {
        message: "Invoice created successfully",
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - create`,
        JSON.stringify(error)
      );
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: "Get all invoices with pagination" })
  async findAll(
    @Query() query: PaginationQuery,
    @Req() req: Request & { user: { companyId: string } }
  ) {
    try {
      const user = req.user;
      const data = await this.invoicesService.findAll(
        user.companyId.toString(),
        query
      );
      if (data) {
        return {
          payload: data,
          message: "Invoices fetched successfully",
          status: HttpStatus.OK,
        };
      }
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - findAll`,
        JSON.stringify(error)
      );
      throw error;
    }
  }

  @Get("stats")
  @ApiOperation({ summary: "Get invoice statistics" })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getStats(@GetUser() user: User) {
    return this.invoicesService.getStats(user.companyId.toString());
  }

  @Get(":id")
  @ApiOperation({ summary: "Get invoice by ID" })
  async findOne(@Param("id") id: string, @GetUser() user: User) {
    try {
      const invoice = await this.invoicesService.findOne(
        id,
        user.companyId.toString()
      );
      if (invoice) {
        return {
          payload: invoice,
          message: "Invoice gotten successfully",
          status: HttpStatus.OK,
        };
      }
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - findOne`,
        JSON.stringify(error)
      );
      throw error;
    }
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update invoice" })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param("id") id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @GetUser() user: User
  ) {
    try {
      await this.invoicesService.update(
        id,
        updateInvoiceDto,
        user.companyId.toString()
      );
      return {
        message: "Invoice updated successfully",
        status: HttpStatus.OK
      }
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - update`,
        JSON.stringify(error)
      );
      throw error;
    }
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update invoice status" })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateInvoiceStatusDto,
    @GetUser() user: User
  ) {
    try {
      await this.invoicesService.updateStatus(
        id,
        updateStatusDto.status,
        user.companyId.toString()
      );
      return {
        message: "Invoice status updated successfully",
        status: HttpStatus.OK
      };
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - updateStatus`,
        JSON.stringify(error)
      );
      throw error;
    }
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete invoice" })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
 async  remove(@Param("id") id: string, @GetUser() user: User) {
    try {
      await this.invoicesService.remove(id, user.companyId.toString());
      return {
        message: "Invoice deleted successfully",
        status: HttpStatus.OK
      };
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - remove`,
        JSON.stringify(error)
      );
      throw error;
    }
  }
}

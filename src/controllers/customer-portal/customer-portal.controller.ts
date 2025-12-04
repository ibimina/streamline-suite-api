import { GetUser } from "@/common/decorators/get-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";
import { PaginationQuery, UserRole } from "@/common/types";
import { UpdateAccountDto } from "@/models/dto/account/update-account.dto";
import { CreateCustomerDto } from "@/models/dto/customer/create-customer.dto";
import { CreateInvoiceDto } from "@/models/dto/invoices/create-invoice.dto";
import { UpdateInvoiceDto, UpdateInvoiceStatusDto } from "@/models/dto/invoices/update-invoice.dto";
import { CreateQuotationDto } from "@/models/dto/quotations/create-quotation.dto";
import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";
import { User } from "@/schemas/user.schema";
import { AccountService } from "@/services/account/account.service";
import { CustomerService } from "@/services/customer/customer.service";
import { InvoicesService } from "@/services/invoice/invoices.service";
import { QuotationsService } from "@/services/quotation/quotations.service";
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ObjectId } from "mongoose";



@ApiTags("customer-portal")
@Controller("customer-portal")
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class CustomerPortalController {
  constructor(private readonly accountService: AccountService,
    private readonly invoicesService: InvoicesService,
    private readonly customerService: CustomerService,
       private readonly quotationsService: QuotationsService
     ) {}
   
     @Get("account/dashboard-stats")
     @ApiOperation({ summary: "Get account statistics" })
     async getDashboardStats(@Req() req: Request & { user: { accountId: string } }) {
       console.log(req)
       return await this.accountService.getStats(req.user.accountId.toString());
     }
   
     @Put("account")
     @ApiOperation({ summary: "Update account" })
     async updateAccount(
       @Body() updateAccountDto: UpdateAccountDto,
       @Req() req: Request & { user: { id: string; accountId: string } }
     ) {
       return this.accountService.update(
         req.user.accountId,
         updateAccountDto,
         req.user.id
       );
     }
   
     @Post("account/logo")
     @ApiOperation({ summary: "Upload account logo" })
     async uploadLogo(
       @Req() req: Request & { user: { id: string; accountId: string } },
       @Body() uploadFileDto: UploadFileDto
     ) {
       try {
         const result = await this.accountService.uploadLogo(
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
     @Delete("account")
     @ApiOperation({ summary: "Delete account logo" })
     async deleteLogo(
       @Req() req: Request & { user: { id: string; accountId: string } }
     ) {
       try {
         const result = await this.accountService.deleteLogo(
           req.user.id,
           req.user.accountId
         );
         if (result) {
           return {
             payload: result,
             message: "Account logo deleted successfully",
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

    @Post("account-invoices")
    @ApiOperation({ summary: "Create a new invoice" })
    async create(
      @Body() createInvoiceDto: CreateInvoiceDto,
      @Req() req: Request & { user: { id: string; accountId: string } }
    ) {
      try {
        const user = req.user;
        await this.invoicesService.create(
          createInvoiceDto,
          user.accountId.toString(),
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
  
    @Get("account-invoices")
    @ApiOperation({ summary: "Get all invoices with pagination" })
    async findAll(
      @Query() query: PaginationQuery,
      @Req() req: Request & { user: { accountId: string } }
    ) {
      try {
        const user = req.user;
        const data = await this.invoicesService.findAll(
          user.accountId.toString(),
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
  
    @Get("account-invoices/stats")
    @ApiOperation({ summary: "Get invoice statistics" })
    getInvoiceStats(@GetUser() user: User) {
      return this.invoicesService.getStats(user.account.toString());
    }
  
    @Get("account-invoices/:id")
    @ApiOperation({ summary: "Get invoice by ID" })
    async findOne(@Param("id") id: string, @GetUser() user: User) {
      try {
        const invoice = await this.invoicesService.findOne(
          id,
          user.account.toString()
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
  
    @Patch("accountinvoices/:id")
    @ApiOperation({ summary: "Update invoice" })
    async update(
      @Param("id") id: string,
      @Body() updateInvoiceDto: UpdateInvoiceDto,
      @GetUser() user: User
    ) {
      try {
        await this.invoicesService.update(
          id,
          updateInvoiceDto,
          user.account.toString()
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
  
    @Patch("account-invoices/:id/status")
    @ApiOperation({ summary: "Update invoice status" })
    async updateStatus(
      @Param("id") id: string,
      @Body() updateStatusDto: UpdateInvoiceStatusDto,
      @GetUser() user: User
    ) {
      try {
        await this.invoicesService.updateStatus(
          id,
          updateStatusDto.status,
          user.account.toString()
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
  
    @Delete("account-invoices/:id")
    @ApiOperation({ summary: "Delete invoice" })
   async  remove(@Param("id") id: string, @GetUser() user: User) {
      try {
        await this.invoicesService.remove(id, user.account.toString());
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

    // Create a new customer
    @Post("account-customers")
    async createClient(
      @Body() dto: CreateCustomerDto,
      @Req() req: Request & { user: { id: string; accountId: string } }
    ) {
      try {
        await this.customerService.createCustomer(dto, req.user.accountId);
        return {
          message: "Customer created successfully.",
          status: HttpStatus.CREATED,
        };
      } catch (error) {
        console.error(
          `Error occured in Customer Controller in - create`,
          JSON.stringify(error)
        );
        throw error;
      }
    }
  
    // Get all customers for a account (with simple pagination)
    @Get("account-customers")
    @HttpCode(HttpStatus.OK)
    async getAllCompanyCustomers(
      @Query("page") page = "1",
      @Query("limit") limit = "25",
      @Req() req: Request & { user: { id: string; accountId: string } },
      @Body() filter: any
    ) {
      try {
        const pageNum = Math.max(1, parseInt(page as any, 10) || 1);
        const limitNum = Math.min(100, parseInt(limit as any, 10) || 25);
        const customers = await this.customerService.getAllCompanyCustomers(
          filter,
          { page: pageNum, limit: limitNum },
          req.user.accountId
        );
        if (customers) {
          return {
            message: "Customers retrieved successfully.",
            payload: customers,
            status: HttpStatus.OK,
          };
        }
      } catch (error) {
        console.error(
          `Error occured in Customer Controller in - getAllCompanyCustomers`,
          JSON.stringify(error)
        );
        throw error;
      }
    }
  
    // Get a single customer by id
    @Get("account-customers/:id")
    @HttpCode(HttpStatus.OK)
    async get(
      @Param("id") id: string,
      @Req() req: Request & { user: { id: string; accountId: string } }
    ) {
      try {
        const customer = await this.customerService.getCustomerById(
          id,
          req.user.accountId
        );
        return {
          message: "Customer retrieved successfully.",
          payload: customer,
          status: HttpStatus.OK,
        };
      } catch (error) {
        console.error(
          `Error occured in Customer Controller in - get`,
          JSON.stringify(error)
        );
        throw error;
      }
    }
  
    // Deactivate a customer (soft delete / disable)
    @Patch("account-customers/:id/deactivate")
    @HttpCode(HttpStatus.OK)
    async deactivate(
      @Req() req: Request & { user: { id: string; accountId: string } },
  
      @Param("id") id: string
    ) {
      try {
        await this.customerService.deactivateCompanyCustomer(
          req.user.accountId,
          id
        );
  
        return {
          message: "Customer deactivated successfully.",
          status: HttpStatus.OK,
        };
      } catch (error) {
        console.error(
          `Error occured in Customer Controller in - deactivate`,
          JSON.stringify(error)
        );
        throw error;
      }
    }
  
    // Delete a account customer (hard delete)
    @Delete("account-customers/:customerId")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteCompanyCustomer(
      @Req() req: Request & { user: { id: string; accountId: string } },
      @Param("customerId") customerId: string
    ) {
      try {
        await this.customerService.deleteCompanyCustomer(
          req.user.accountId,
          customerId
        );
        return {
          message: "Customer deleted successfully.",
          status: HttpStatus.OK,
        };
      } catch (error) {
        console.error(
          `Error occured in Customer Controller in - deleteCompanyCustomer`,
          JSON.stringify(error)
        );
        throw error;
      }
    }

    @Post("account-quotations")
        @ApiOperation({ summary: "Create a new quotation" })
        async createQuotation(
          @Body() createQuotationDto: CreateQuotationDto,
          @Req() req: Request & { user: { id: string; accountId: ObjectId } }
        ) {
          try {
            const user = req.user;
            await this.quotationsService.create(
              createQuotationDto,
              user.accountId,
              user.id
            );
            return {
              message: "Quotation created successfully",
              status: HttpStatus.CREATED,
            };
          } catch (error) {
            console.error(
              `Error occured in Quotations Controller in - create`,
              JSON.stringify(error)
            );
            throw error;
          }
        }

}
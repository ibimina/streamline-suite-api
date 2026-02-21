import { GetUser } from "@/common/decorators/get-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";
import { PaginationQuery, UserRole } from "@/common/types";
import { UpdateAccountDto } from "@/models/dto/account/update-account.dto";
import { CreateCustomerDto } from "@/models/dto/customer/create-customer.dto";
import { CreateInvoiceDto } from "@/models/dto/invoices/create-invoice.dto";
import {
  UpdateInvoiceDto,
  UpdateInvoiceStatusDto,
} from "@/models/dto/invoices/update-invoice.dto";
import { CreateQuotationDto } from "@/models/dto/quotations/create-quotation.dto";
import {
  UpdateQuotationDto,
  UpdateInvoiceStatusDto as UpdateQuotationStatusDto,
} from "@/models/dto/quotations/update-quotation.dto";
import { CreateSupplierDto } from "@/models/dto/supplier/create-supplier.dto";
import { UpdateSupplierDto } from "@/models/dto/supplier/update-supplier.dto";
import { UploadFileDto } from "@/models/dto/upload-file/upload-file.dto";
import { User } from "@/schemas/user.schema";
import { AccountService } from "@/services/account/account.service";
import { AuthService } from "@/services/auth/auth.service";
import { CustomerService } from "@/services/customer/customer.service";
import { InvoicesService } from "@/services/invoice/invoices.service";
import { QuotationsService } from "@/services/quotation/quotations.service";
import { SupplierService } from "@/services/supplier/supplier.service";
import { ProductService } from "@/services/product/product.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ObjectId } from "mongoose";
import { CreateProductDto } from "@/models/dto/product/create-product.dto";
import { UpdateProductDto } from "@/models/dto/product/update-product.dto";
import { UpdateInventoryTransactionDto } from "@/models/dto/inventory-transaction/update-inventory-transaction.dto";
import { CreateInventoryTransactionDto } from "@/models/dto/inventory-transaction/create-inventory-transaction.dto";
import { InventoryTransactionService } from "@/services/inventory-transaction/inventory-transaction.service";
import { TemplateService } from "@/services/templates/template.service";
import { UpdateUserDto } from "@/models/dto/users/update-user.dto";
import { CreateUserDto } from "@/models/dto/users/user.dto";
import { UserService } from "@/services/user/user.service";
import { CreateStaffDto, UpdateStaffDto } from "@/models/dto/staff";
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  UpdateExpenseStatusDto,
} from "@/models/dto/expenses";
import {
  CreatePayrollDto,
  UpdatePayrollDto,
  UpdatePayrollStatusDto,
} from "@/models/dto/payroll";
import {
  CreateTaxReportDto,
  UpdateTaxReportStatusDto,
  FileTaxReportDto,
  PayTaxReportDto,
} from "@/models/dto/tax";
import { RoleName } from "@/models/enums/shared.enum";
import { StaffService } from "@/services/staff/staff.service";
import { ExpenseService } from "@/services/expense/expense.service";
import { PayrollService } from "@/services/payroll/payroll.service";
import { TaxService } from "@/services/tax/tax.service";
import { AnalyticsService } from "@/services/analytics/analytics.service";
import { ExpenseCategory, ExpenseStatus } from "@/schemas/expense.schema";
import { PayrollStatus, PayFrequency } from "@/schemas/payroll.schema";
import { TaxReportType, TaxReportStatus } from "@/schemas/tax-report.schema";

@ApiTags("customer-portal")
@Controller("customer-portal")
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class CustomerPortalController {
  constructor(
    private readonly accountService: AccountService,
    private readonly invoicesService: InvoicesService,
    private readonly customerService: CustomerService,
    private readonly quotationsService: QuotationsService,
    private readonly authService: AuthService,
    private readonly supplierService: SupplierService,
    private readonly productService: ProductService,
    private readonly inventoryTransactionService: InventoryTransactionService,
    private readonly templateService: TemplateService,
    private readonly userService: UserService,
    private readonly staffService: StaffService,
    private readonly expenseService: ExpenseService,
    private readonly payrollService: PayrollService,
    private readonly taxService: TaxService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "User logout - Invalidates all user tokens (token-free)",
  })
  @ApiResponse({
    status: 200,
    description: "Logout successful - all tokens invalidated",
  })
  async logout(
    @Req() req: { user: { id: string }; headers: { authorization?: string } },
  ) {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const payload = await this.authService.logout(token, req.user.id);
      return {
        payload,
        message: "Logout successful - all tokens invalidated",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Customer Portal Controller in - logout`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("account/dashboard-stats")
  @ApiOperation({ summary: "Get account statistics" })
  async getDashboardStats(
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.accountService.getStats(
        req.user.accountId.toString(),
      );
      return {
        payload,
        message: "Dashboard stats retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Account Controller in - getDashboardStats`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Put("account")
  @ApiOperation({ summary: "Update account" })
  async updateAccount(
    @Body() updateAccountDto: UpdateAccountDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const payload = await this.accountService.update(
        req.user.accountId,
        updateAccountDto,
        req.user.id,
      );
      return {
        payload,
        message: "Account updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Account Controller in - updateAccount`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Post("account/logo")
  @ApiOperation({ summary: "Upload account logo" })
  async uploadLogo(
    @Req() req: Request & { user: { id: string; accountId: string } },
    @Body() uploadFileDto: UploadFileDto,
  ) {
    try {
      const result = await this.accountService.uploadLogo(
        uploadFileDto,
        req.user.accountId,
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
        JSON.stringify(error),
      );
      throw error;
    }
  }
  @Delete("account")
  @ApiOperation({ summary: "Delete account logo" })
  async deleteLogo(
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const result = await this.accountService.deleteLogo(
        req.user.id,
        req.user.accountId,
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
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Post("invoices")
  @ApiOperation({ summary: "Create a new invoice" })
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const user = req.user;
      await this.invoicesService.create(
        createInvoiceDto,
        user.accountId.toString(),
        user.id,
      );
      return {
        message: "Invoice created successfully",
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - create`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("invoices")
  @ApiOperation({ summary: "Get all invoices with pagination" })
  async findAllInvoice(
    @Query() query: PaginationQuery,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const user = req.user;
      const data = await this.invoicesService.findAll(
        user.accountId.toString(),
        query,
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
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("invoices/stats")
  @ApiOperation({ summary: "Get invoice statistics" })
  async getInvoiceStats(@Req() req: Request & { user: { accountId: string } }) {
    try {
      const payload = await this.invoicesService.getStats(req.user.accountId);
      return {
        payload,
        message: "Invoice statistics fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - getInvoiceStats`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("invoices/available-quotations")
  @ApiOperation({ summary: "Get quotations available for linking to invoice" })
  @ApiQuery({
    name: "customerId",
    required: false,
    description: "Filter by customer ID",
  })
  async getAvailableQuotationsForInvoice(
    @Query("customerId") customerId: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const quotations =
        await this.invoicesService.getAvailableQuotationsForLinking(
          req.user.accountId.toString(),
          customerId,
        );
      return {
        payload: quotations,
        message: "Available quotations fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Invoices Controller - getAvailableQuotationsForInvoice`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("invoices/:id")
  @ApiOperation({ summary: "Get invoice by ID" })
  async findOne(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const invoice = await this.invoicesService.findOne(
        id,
        req.user.accountId,
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
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("invoices/:id")
  @ApiOperation({ summary: "Update invoice" })
  async update(
    @Param("id") id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      await this.invoicesService.update(
        id,
        updateInvoiceDto,
        req.user.accountId,
      );
      return {
        message: "Invoice updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - update`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("invoices/:id/status")
  @ApiOperation({ summary: "Update invoice status" })
  async updateStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateInvoiceStatusDto,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      await this.invoicesService.updateStatus(
        id,
        updateStatusDto.status,
        req.user.accountId,
      );
      return {
        message: "Invoice status updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - updateStatus`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("invoices/:id")
  @ApiOperation({ summary: "Delete invoice" })
  async remove(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      await this.invoicesService.remove(id, req.user.accountId);
      return {
        message: "Invoice deleted successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Invoices Controller in - remove`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  // Create a new customer
  @Post("customer")
  async createClient(
    @Body() dto: CreateCustomerDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
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
        JSON.stringify(error),
      );
      throw error;
    }
  }

  // Get all customers for a account (with simple pagination)
  @Get("customers")
  @HttpCode(HttpStatus.OK)
  async getAllCompanyCustomers(
    @Query("page") page = "1",
    @Query("limit") limit = "25",
    @Req() req: Request & { user: { id: string; accountId: string } },
    @Body() filter: any,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page as any, 10) || 1);
      const limitNum = Math.min(100, parseInt(limit as any, 10) || 25);
      const customers = await this.customerService.getAllCompanyCustomers(
        filter,
        { page: pageNum, limit: limitNum },
        req.user.accountId,
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
        JSON.stringify(error),
      );
      throw error;
    }
  }

  // Get a single customer by id
  @Get("customers/:id")
  @HttpCode(HttpStatus.OK)
  async get(
    @Param("id") id: string,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const customer = await this.customerService.getCustomerById(
        id,
        req.user.accountId,
      );
      return {
        message: "Customer retrieved successfully.",
        payload: customer,
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Customer Controller in - get`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("customers/:id/deactivate")
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Req() req: Request & { user: { id: string; accountId: string } },

    @Param("id") id: string,
  ) {
    try {
      await this.customerService.deactivateCompanyCustomer(
        req.user.accountId,
        id,
      );

      return {
        message: "Customer deactivated successfully.",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Customer Controller in - deactivate`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  // Delete a account customer (hard delete)
  @Delete("customers/:customerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCompanyCustomer(
    @Req() req: Request & { user: { id: string; accountId: string } },
    @Param("customerId") customerId: string,
  ) {
    try {
      await this.customerService.deleteCompanyCustomer(
        req.user.accountId,
        customerId,
      );
      return {
        message: "Customer deleted successfully.",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Customer Controller in - deleteCompanyCustomer`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Post("quotations")
  @ApiOperation({ summary: "Create a new quotation" })
  async createQuotation(
    @Body() createQuotationDto: CreateQuotationDto,
    @Req() req: Request & { user: { id: string; accountId: ObjectId } },
  ) {
    try {
      const user = req.user;
      console.log(user, "==========");
      await this.quotationsService.create(
        createQuotationDto,
        user.accountId,
        user.id,
      );
      return {
        message: "Quotation created successfully",
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.error(
        `Error occured in Quotations Controller in - create`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("quotations")
  @ApiOperation({ summary: "Get all quotations with pagination" })
  @ApiQuery({ name: "page", required: false, description: "Page number" })
  @ApiQuery({ name: "limit", required: false, description: "Items per page" })
  @ApiQuery({ name: "search", required: false, description: "Search term" })
  @ApiQuery({ name: "sortBy", required: false, description: "Sort field" })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  @ApiResponse({
    status: 200,
    description: "Quotations retrieved successfully",
  })
  async findAllQuotations(
    @Query() query: PaginationQuery,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.quotationsService.findAll(
        req.user.accountId.toString(),
        query,
      );
      return {
        payload,
        message: "Quotations fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Quotations Controller - findAll`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("quotations/stats")
  @ApiOperation({ summary: "Get quotation statistics" })
  @ApiResponse({
    status: 200,
    description: "Quotation stats retrieved successfully",
  })
  async getQuotationStats(
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.quotationsService.getStats(
        req.user.accountId.toString(),
      );
      return {
        payload,
        message: "Quotation statistics fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Quotations Controller - getStats`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("quotations/:id")
  @ApiOperation({ summary: "Get quotation by ID" })
  @ApiParam({ name: "id", description: "Quotation ID" })
  @ApiResponse({ status: 200, description: "Quotation retrieved successfully" })
  @ApiResponse({ status: 404, description: "Quotation not found" })
  async findOneQuotation(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.quotationsService.findOne(
        id,
        req.user.accountId.toString(),
      );
      return {
        payload,
        message: "Quotation fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Quotations Controller - findOne`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("quotations/:id")
  @ApiOperation({ summary: "Update quotation" })
  @ApiParam({ name: "id", description: "Quotation ID" })
  @ApiResponse({ status: 200, description: "Quotation updated successfully" })
  @ApiResponse({ status: 404, description: "Quotation not found" })
  async updateQuotation(
    @Param("id") id: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      await this.quotationsService.update(
        id,
        updateQuotationDto,
        req.user.accountId.toString(),
      );
      return {
        message: "Quotation updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Quotations Controller - update`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("quotations/:id/status")
  @ApiOperation({ summary: "Update quotation status" })
  @ApiParam({ name: "id", description: "Quotation ID" })
  @ApiResponse({
    status: 200,
    description: "Quotation status updated successfully",
  })
  async updateQuotationStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateQuotationStatusDto,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      await this.quotationsService.updateStatus(
        id,
        updateStatusDto.status,
        req.user.accountId.toString(),
      );
      return {
        message: "Quotation status updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Quotations Controller - updateStatus`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Post("quotations/:id/convert-to-invoice")
  @ApiOperation({ summary: "Convert quotation to invoice" })
  @ApiParam({ name: "id", description: "Quotation ID" })
  @ApiResponse({
    status: 200,
    description: "Quotation converted to invoice successfully",
  })
  @ApiResponse({ status: 400, description: "Cannot convert quotation" })
  async convertQuotationToInvoice(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string; id: string } },
  ) {
    try {
      const result = await this.quotationsService.convertToInvoice(
        id,
        req.user.accountId.toString(),
        req.user.id?.toString(),
      );
      return {
        payload: {
          invoiceId: result.invoice._id,
          invoiceNumber: result.invoice.uniqueId,
          quotation: result.quotation,
        },
        message: "Quotation converted to invoice successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Quotations Controller - convertToInvoice`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("quotations/:id")
  @ApiOperation({ summary: "Delete quotation" })
  @ApiParam({ name: "id", description: "Quotation ID" })
  @ApiResponse({ status: 200, description: "Quotation deleted successfully" })
  @ApiResponse({ status: 404, description: "Quotation not found" })
  async removeQuotation(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      await this.quotationsService.remove(id, req.user.accountId.toString());
      return {
        message: "Quotation deleted successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Quotations Controller - remove`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  // ============ EXPENSES ============

  @Post("expenses")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new expense" })
  @ApiResponse({ status: 201, description: "Expense created successfully" })
  async createExpense(
    @Body() createExpenseDto: CreateExpenseDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const payload = await this.expenseService.create(
        createExpenseDto,
        req.user.accountId,
        req.user.id,
      );
      return {
        payload,
        message: "Expense created successfully",
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.error(
        `Error in Expense Controller - create`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("expenses")
  @ApiOperation({ summary: "Get all expenses with pagination" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "sortBy", required: false })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  @ApiQuery({ name: "category", required: false, enum: ExpenseCategory })
  @ApiQuery({ name: "status", required: false, enum: ExpenseStatus })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "vendor", required: false })
  @ApiResponse({ status: 200, description: "Expenses retrieved successfully" })
  async findAllExpenses(
    @Query()
    query: PaginationQuery & {
      category?: ExpenseCategory;
      status?: ExpenseStatus;
      startDate?: string;
      endDate?: string;
      vendor?: string;
    },
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.expenseService.findAll(
        req.user.accountId,
        query,
      );
      return {
        payload,
        message: "Expenses fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Expense Controller - findAll`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("expenses/stats")
  @ApiOperation({ summary: "Get expense statistics" })
  @ApiResponse({
    status: 200,
    description: "Expense stats retrieved successfully",
  })
  async getExpenseStats(@Req() req: Request & { user: { accountId: string } }) {
    try {
      const payload = await this.expenseService.getStats(req.user.accountId);
      return {
        payload,
        message: "Expense statistics fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Expense Controller - getStats`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("expenses/category/:category")
  @ApiOperation({ summary: "Get expenses by category" })
  @ApiParam({ name: "category", enum: ExpenseCategory })
  @ApiResponse({ status: 200, description: "Expenses retrieved successfully" })
  async findExpensesByCategory(
    @Param("category") category: ExpenseCategory,
    @Query() query: PaginationQuery,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.expenseService.findByCategory(
        req.user.accountId,
        category,
        query,
      );
      return {
        payload,
        message: "Expenses fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Expense Controller - findByCategory`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("expenses/:id")
  @ApiOperation({ summary: "Get expense by ID" })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({ status: 200, description: "Expense retrieved successfully" })
  @ApiResponse({ status: 404, description: "Expense not found" })
  async findOneExpense(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.expenseService.findOne(id, req.user.accountId);
      return {
        payload,
        message: "Expense fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Expense Controller - findOne`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("expenses/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update expense" })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({ status: 200, description: "Expense updated successfully" })
  async updateExpense(
    @Param("id") id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.expenseService.update(
        id,
        updateExpenseDto,
        req.user.accountId,
      );
      return {
        payload,
        message: "Expense updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Expense Controller - update`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("expenses/:id/status")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update expense status" })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({
    status: 200,
    description: "Expense status updated successfully",
  })
  async updateExpenseStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateExpenseStatusDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const payload = await this.expenseService.updateStatus(
        id,
        updateStatusDto.status,
        req.user.accountId,
        req.user.id,
      );
      return {
        payload,
        message: "Expense status updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Expense Controller - updateStatus`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("expenses/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Delete expense" })
  @ApiParam({ name: "id", description: "Expense ID" })
  @ApiResponse({ status: 200, description: "Expense deleted successfully" })
  async removeExpense(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      await this.expenseService.remove(id, req.user.accountId);
      return {
        message: "Expense deleted successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Expense Controller - remove`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Post("suppliers")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new supplier" })
  @ApiResponse({
    status: 201,
    description: "Supplier created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed or duplicate name/email",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async createSupplier(
    @Body() createSupplierDto: CreateSupplierDto,
    @Request() req: { user: { accountId: string; id: string } },
  ) {
    try {
      const payload = await this.supplierService.createSupplier(
        createSupplierDto,
        req.user.accountId,
        req.user.id,
      );
      return {
        payload,
        message: "Supplier created successfully",
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.error(
        `Error occured in Supplier Controller in - createSupplier`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("suppliers")
  @ApiOperation({ summary: "Get all suppliers with pagination and search" })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Items per page (default: 10)",
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search term for name, contact, email, phone, or tax ID",
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    description: "Field to sort by (default: createdAt)",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    description: "Sort order: asc or desc (default: desc)",
    enum: ["asc", "desc"],
  })
  @ApiResponse({
    status: 200,
    description: "Suppliers retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async findAllSuppliers(@Query() query: PaginationQuery, @Request() req) {
    try {
      const payload = await this.supplierService.findAllSuppliers(
        req.user.accountId,
        query,
      );
      return {
        payload,
        message: "Suppliers retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Supplier Controller in - findAllSuppliers`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("supplier/stats")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Get supplier statistics" })
  @ApiResponse({
    status: 200,
    description: "Supplier statistics retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async getStats(@Request() req) {
    try {
      const payload = await this.supplierService.getStats(req.user.accountId);
      return {
        payload,
        message: "Supplier statistics retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Supplier Controller in - getStats`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("suppliers/active")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: "Get all active suppliers" })
  @ApiResponse({
    status: 200,
    description: "Active suppliers retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async getActiveSuppliers(@Request() req) {
    try {
      const payload = await this.supplierService.getActiveSuppliers(
        req.user.accountId,
      );
      return {
        payload,
        message: "Active suppliers retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Supplier Controller in - getActiveSuppliers`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("suppliers/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: "Get a supplier by ID" })
  @ApiParam({
    name: "id",
    description: "Supplier ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Supplier retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Supplier not found",
  })
  async findSupplierById(@Param("id") id: string, @Request() req) {
    try {
      const payload = await this.supplierService.findSupplierById(
        id,
        req.user.accountId,
      );
      return {
        payload,
        message: "Supplier retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Supplier Controller in - findSupplierById`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("suppliers/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update a supplier" })
  @ApiParam({
    name: "id",
    description: "Supplier ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Supplier updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed or duplicate name/email",
  })
  @ApiResponse({
    status: 404,
    description: "Supplier not found",
  })
  async updateSupplier(
    @Param("id") id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Request() req,
  ) {
    try {
      const payload = await this.supplierService.updateSupplier(
        id,
        updateSupplierDto,
        req.user.accountId,
      );
      return {
        payload,
        message: "Supplier updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Supplier Controller in - updateSupplier`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("suppliers/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Delete a supplier" })
  @ApiResponse({
    status: 200,
    description: "Supplier deleted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Supplier not found",
  })
  async removeSupplier(@Param("id") id: string, @Request() req) {
    try {
      await this.supplierService.removeSupplier(id, req.user.accountId);
      return {
        message: "Supplier deleted successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Supplier Controller in - removeSupplier`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Post("products")
  @ApiOperation({ summary: "Create a new product" })
  @ApiResponse({
    status: 201,
    description: "Product created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @Request() req,
  ) {
    try {
      const payload = await this.productService.create(
        createProductDto,
        req.user.accountId,
        req.user.id,
      );
      return {
        payload,
        message: "Product created successfully",
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.error(
        `Error occured in Product Controller in - createProduct`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("products")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: "Get all products with pagination and search" })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Items per page (default: 10)",
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search term for name, SKU, description, category, or brand",
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    description: "Field to sort by (default: createdAt)",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    description: "Sort order: asc or desc (default: desc)",
    enum: ["asc", "desc"],
  })
  @ApiResponse({
    status: 200,
    description: "Products retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async findAllProducts(@Query() query: PaginationQuery, @Request() req) {
    try {
      const payload = await this.productService.findAll(
        req.user.accountId,
        query,
      );
      return {
        payload,
        message: "Products retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Product Controller in - findAllProducts`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("products/stats")
  @ApiOperation({ summary: "Get product statistics" })
  @ApiResponse({
    status: 200,
    description: "Product statistics retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async getProductStats(@Request() req: { user: { accountId: string } }) {
    try {
      const payload = await this.productService.getStats(req.user.accountId);
      return {
        payload,
        message: "Product statistics retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Product Controller in - getProductStats`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("products/low-stock")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Get products with low stock" })
  @ApiResponse({
    status: 200,
    description: "Low stock products retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async getLowStockProducts(@Request() req) {
    try {
      const payload = await this.productService.getLowStockProducts(
        req.user.accountId,
      );
      return {
        payload,
        message: "Low stock products retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Product Controller in - getLowStockProducts`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("products/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: "Get a product by ID" })
  @ApiParam({
    name: "id",
    description: "Product ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Product retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Product not found",
  })
  async findProductById(@Param("id") id: string, @Request() req) {
    try {
      const payload = await this.productService.findOne(id, req.user.accountId);
      return {
        payload,
        message: "Product retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Product Controller in - findProductById`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("products/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update a product" })
  @ApiParam({
    name: "id",
    description: "Product ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Product updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed",
  })
  @ApiResponse({
    status: 404,
    description: "Product not found",
  })
  async updateProduct(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    try {
      const payload = await this.productService.update(
        id,
        updateProductDto,
        req.user.accountId,
      );
      return {
        payload,
        message: "Product updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Product Controller in - updateProduct`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("products/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Delete a product" })
  @ApiParam({
    name: "id",
    description: "Product ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Product deleted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Product not found",
  })
  async removeProduct(@Param("id") id: string, @Request() req) {
    try {
      await this.productService.remove(id, req.user.accountId);
      return {
        message: "Product deleted successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Product Controller in - removeProduct`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Post("inventory-transactions")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new inventory transaction" })
  @ApiResponse({
    status: 201,
    description: "Inventory transaction created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed or insufficient stock",
  })
  @ApiResponse({
    status: 404,
    description: "Account or product not found",
  })
  async createInventoryTransaction(
    @Body() createInventoryTransactionDto: CreateInventoryTransactionDto,
    @Request() req,
  ) {
    try {
      const payload =
        await this.inventoryTransactionService.createInventoryTransaction(
          createInventoryTransactionDto,
          req.user.accountId,
          req.user.id,
        );
      return {
        payload,
        message: "Inventory transaction created successfully",
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.error(
        `Error occured in Inventory Transaction Controller in - createInventoryTransaction`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("inventory-transactions")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({
    summary: "Get all inventory transactions with pagination and filters",
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Items per page (default: 10)",
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search term for reference or notes",
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    description: "Field to sort by (default: createdAt)",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    description: "Sort order: asc or desc (default: desc)",
    enum: ["asc", "desc"],
  })
  @ApiQuery({
    name: "productId",
    required: false,
    description: "Filter by product ID",
  })
  @ApiQuery({
    name: "transactionType",
    required: false,
    description: "Filter by transaction type",
    enum: ["stock_in", "stock_out", "adjustment", "transfer"],
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filter by status",
    enum: ["pending", "completed", "cancelled"],
  })
  @ApiQuery({
    name: "warehouseId",
    required: false,
    description: "Filter by warehouse ID",
  })
  @ApiResponse({
    status: 200,
    description: "Inventory transactions retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async findAllInventoryTransactions(
    @Query()
    query: PaginationQuery & {
      productId?: string;
      transactionType?: string;
      status?: string;
      warehouseId?: string;
    },
    @Request() req,
  ) {
    try {
      const payload =
        await this.inventoryTransactionService.findAllInventoryTransactions(
          req.user.accountId,
          query,
        );
      return {
        payload,
        message: "Inventory transactions retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Inventory Transaction Controller in - findAllInventoryTransactions`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("inventory-transactions/stats")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Get inventory transaction statistics" })
  @ApiResponse({
    status: 200,
    description: "Inventory transaction statistics retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async getInventoryTransactionStats(@Request() req) {
    return this.inventoryTransactionService.getInventoryTransactionStats(
      req.user.accountId,
    );
  }

  @Get("inventory-transactions/product/:productId/history")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: "Get transaction history for a specific product" })
  @ApiParam({
    name: "productId",
    description: "Product ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Product transaction history retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Product or account not found",
  })
  async getInventoryTransactionHistory(
    @Param("productId") productId: string,
    @Request() req,
  ) {
    return this.inventoryTransactionService.getInventoryTransactionHistory(
      productId,
      req.user.accountId,
    );
  }

  @Get("inventory-transactions/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: "Get an inventory transaction by ID" })
  @ApiParam({
    name: "id",
    description: "Inventory transaction ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Inventory transaction retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Inventory transaction not found",
  })
  async findByIdInventoryTransaction(@Param("id") id: string, @Request() req) {
    try {
      const payload =
        await this.inventoryTransactionService.findByIdInventoryTransaction(
          id,
          req.user.accountId,
        );
      return {
        payload,
        message: "Inventory transaction retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Inventory Transaction Controller in - findByIdInventoryTransaction`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("inventory-transactions/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update an inventory transaction" })
  @ApiParam({
    name: "id",
    description: "Inventory transaction ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Inventory transaction updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed or transaction completed",
  })
  @ApiResponse({
    status: 404,
    description: "Inventory transaction not found",
  })
  async updateInventoryTransaction(
    @Param("id") id: string,
    @Body() updateInventoryTransactionDto: UpdateInventoryTransactionDto,
    @Request() req,
  ) {
    try {
      const payload =
        await this.inventoryTransactionService.updateInventoryTransaction(
          id,
          updateInventoryTransactionDto,
          req.user.accountId,
        );
      return {
        payload,
        message: "Inventory transaction updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error occured in Inventory Transaction Controller in - updateInventoryTransaction`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("inventory-transactions/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Delete an inventory transaction" })
  @ApiParam({
    name: "id",
    description: "Inventory transaction ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Inventory transaction deleted successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot delete completed stock transaction",
  })
  @ApiResponse({
    status: 404,
    description: "Inventory transaction not found",
  })
  async removeInventoryTransaction(@Param("id") id: string, @Request() req) {
    try {
      await this.inventoryTransactionService.removeInventoryTransaction(
        id,
        req.user.accountId,
      );
      return { message: "Inventory transaction deleted successfully" };
    } catch (error) {
      console.error(
        `Error occured in Inventory Transaction Controller in - removeInventoryTransaction`,
        JSON.stringify(error),
      );
      throw error;
    }
  }
  @Post("templates")
  @ApiOperation({ summary: "Create a new template upload" })
  async uploadTemplate(
    @Req() req: Request & { user: { accountId: string } },
    @Body() uploadFileDto: UploadFileDto,
  ) {
    try {
      const result = await this.templateService.uploadTemplate(
        uploadFileDto,
        req.user.accountId,
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
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("templates")
  @ApiOperation({ summary: "Get all templates for a account" })
  async getAllTemplates(@Req() req: Request & { user: { accountId: string } }) {
    try {
      const templates = await this.templateService.getAllTemplates(
        req.user.accountId,
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
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("templates/:id")
  @ApiOperation({ summary: "Delete a template" })
  async deleteTemplates(
    @Req() req: Request & { user: { accountId: string } },
    @Param("id") id: string,
  ) {
    try {
      await this.templateService.deleteTemplate(req.user.accountId, id);
      return {
        message: "Template deletion successful",
      };
    } catch (error) {
      console.error(
        "Error occured in Template Controller in - deleteTemplates",
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Post("user-register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  @ApiResponse({ status: 409, description: "User already exists" })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    return this.userService.registerUser(
      createUserDto,
      req.user.id,
      req.user.accountId,
    );
  }

  @Post("user-update")
  @ApiOperation({ summary: "Update user information" })
  @ApiResponse({ status: 200, description: "User updated successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async updateUser(
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    return this.userService.updateUser(
      updateUserDto,
      req.user.id,
      req.user.accountId,
    );
  }

  @Post("staff")
  @ApiOperation({ summary: "Create a new staff member" })
  @ApiResponse({
    status: 201,
    description: "Staff member created successfully",
  })
  @ApiResponse({
    status: 409,
    description: "User with this email already exists",
  })
  async createStaff(
    @Body() createStaffDto: CreateStaffDto,
    @GetUser("id") userId: string,
    @GetUser("account") accountId: string,
  ) {
    try {
      const staff = await this.staffService.createStaff(
        createStaffDto,
        userId,
        accountId,
      );
      return {
        payload: staff,
        message: "Staff member created successfully",
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.error(
        `Error in StaffController - createStaff`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("staff")
  @ApiOperation({ summary: "Get all staff members" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "sortBy", required: false, type: String })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  @ApiResponse({
    status: 200,
    description: "Staff list retrieved successfully",
  })
  async getAllStaff(
    @GetUser("account") accountId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "asc" | "desc",
  ) {
    try {
      const result = await this.staffService.findAllStaff(accountId, {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      });
      return {
        payload: {
          staff: result.data,
          total: result.total,
          page: page || 1,
          limit: limit || 10,
        },
        message: "Staff list retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in StaffController - getAllStaff`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("staff/:id")
  @ApiOperation({ summary: "Get a staff member by ID" })
  @ApiParam({ name: "id", description: "Staff member ID" })
  @ApiResponse({
    status: 200,
    description: "Staff member retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Staff member not found" })
  async getStaffById(
    @Param("id") staffId: string,
    @GetUser("account") accountId: string,
  ) {
    try {
      const staff = await this.staffService.findStaffById(staffId, accountId);
      return {
        payload: staff,
        message: "Staff member retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in StaffController - getStaffById`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Put("staff/:id")
  @ApiOperation({ summary: "Update a staff member" })
  @ApiParam({ name: "id", description: "Staff member ID" })
  @ApiResponse({
    status: 200,
    description: "Staff member updated successfully",
  })
  @ApiResponse({ status: 404, description: "Staff member not found" })
  async updateStaff(
    @Param("id") staffId: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @GetUser("account") accountId: string,
    @GetUser("id") userId: string,
  ) {
    try {
      const staff = await this.staffService.updateStaff(
        staffId,
        updateStaffDto,
        accountId,
        userId,
      );
      return {
        payload: staff,
        message: "Staff member updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in StaffController - updateStaff`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("staff/toggle-status/:id")
  @ApiOperation({ summary: "Toggle staff member active status" })
  @ApiParam({ name: "id", description: "Staff member ID" })
  @ApiResponse({
    status: 200,
    description: "Staff status toggled successfully",
  })
  @ApiResponse({ status: 404, description: "Staff member not found" })
  async toggleStaffStatus(
    @Param("id") staffId: string,
    @GetUser("account") accountId: string,
  ) {
    try {
      const staff = await this.staffService.toggleStaffStatus(
        staffId,
        accountId,
      );
      return {
        payload: staff,
        message: "Staff status toggled successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in StaffController - toggleStaffStatus`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("staff/:id")
  @ApiOperation({ summary: "Soft delete a staff member (deactivate)" })
  @ApiParam({ name: "id", description: "Staff member ID" })
  @ApiResponse({
    status: 200,
    description: "Staff member deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Staff member not found" })
  async deleteStaff(
    @Param("id") staffId: string,
    @GetUser("account") accountId: string,
  ) {
    try {
      const result = await this.staffService.deleteStaff(staffId, accountId);
      return {
        payload: result,
        message: result.message,
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in StaffController - deleteStaff`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("staff/delete/:id")
  @ApiOperation({ summary: "Permanently delete a staff member" })
  @ApiParam({ name: "id", description: "Staff member ID" })
  @ApiResponse({ status: 200, description: "Staff member permanently deleted" })
  @ApiResponse({ status: 404, description: "Staff member not found" })
  async hardDeleteStaff(
    @Param("id") staffId: string,
    @GetUser("account") accountId: string,
  ) {
    try {
      const result = await this.staffService.hardDeleteStaff(
        staffId,
        accountId,
      );
      return {
        payload: result,
        message: result.message,
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in StaffController - hardDeleteStaff`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("staff/department/:department")
  @ApiOperation({ summary: "Get staff by department" })
  @ApiParam({ name: "department", description: "Department name" })
  @ApiResponse({
    status: 200,
    description: "Staff list retrieved successfully",
  })
  async getStaffByDepartment(
    @Param("department") department: string,
    @GetUser("account") accountId: string,
  ) {
    try {
      const staff = await this.staffService.findStaffByDepartment(
        accountId,
        department,
      );
      return {
        payload: { staff },
        message: "Staff list retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in StaffController - getStaffByDepartment`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("staff/role/:role")
  @ApiOperation({ summary: "Get staff by role" })
  @ApiParam({ name: "role", enum: RoleName, description: "Staff role" })
  @ApiResponse({
    status: 200,
    description: "Staff list retrieved successfully",
  })
  async getStaffByRole(
    @Param("role") role: RoleName,
    @GetUser("account") accountId: string,
  ) {
    try {
      const staff = await this.staffService.findStaffByRole(accountId, role);
      return {
        payload: { staff },
        message: "Staff list retrieved successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in StaffController - getStaffByRole`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  // ============ PAYROLL ============

  @Post("payroll")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new payroll" })
  @ApiResponse({ status: 201, description: "Payroll created successfully" })
  async createPayroll(
    @Body() createPayrollDto: CreatePayrollDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const payload = await this.payrollService.create(
        createPayrollDto,
        req.user.accountId,
        req.user.id,
      );
      return {
        payload,
        message: "Payroll created successfully",
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.error(
        `Error in Payroll Controller - create`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("payroll")
  @ApiOperation({ summary: "Get all payrolls with pagination" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "sortBy", required: false })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  @ApiQuery({ name: "status", required: false, enum: PayrollStatus })
  @ApiQuery({ name: "payFrequency", required: false, enum: PayFrequency })
  @ApiResponse({ status: 200, description: "Payrolls retrieved successfully" })
  async findAllPayrolls(
    @Query()
    query: PaginationQuery & {
      status?: PayrollStatus;
      payFrequency?: PayFrequency;
    },
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.payrollService.findAll(
        req.user.accountId,
        query,
      );
      return {
        payload,
        message: "Payrolls fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Payroll Controller - findAll`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("payroll/stats")
  @ApiOperation({ summary: "Get payroll statistics" })
  @ApiResponse({
    status: 200,
    description: "Payroll stats retrieved successfully",
  })
  async getPayrollStats(@Req() req: Request & { user: { accountId: string } }) {
    try {
      const payload = await this.payrollService.getStats(req.user.accountId);
      return {
        payload,
        message: "Payroll statistics fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Payroll Controller - getStats`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("payroll/period")
  @ApiOperation({ summary: "Get payrolls by period" })
  @ApiQuery({ name: "startDate", required: true })
  @ApiQuery({ name: "endDate", required: true })
  @ApiResponse({ status: 200, description: "Payrolls retrieved successfully" })
  async getPayrollsByPeriod(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.payrollService.findByPeriod(
        req.user.accountId,
        startDate,
        endDate,
      );
      return {
        payload,
        message: "Payrolls fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Payroll Controller - findByPeriod`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("payroll/:id")
  @ApiOperation({ summary: "Get payroll by ID" })
  @ApiParam({ name: "id", description: "Payroll ID" })
  @ApiResponse({ status: 200, description: "Payroll retrieved successfully" })
  @ApiResponse({ status: 404, description: "Payroll not found" })
  async findOnePayroll(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.payrollService.findOne(id, req.user.accountId);
      return {
        payload,
        message: "Payroll fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Payroll Controller - findOne`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("payroll/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update payroll" })
  @ApiParam({ name: "id", description: "Payroll ID" })
  @ApiResponse({ status: 200, description: "Payroll updated successfully" })
  async updatePayroll(
    @Param("id") id: string,
    @Body() updatePayrollDto: UpdatePayrollDto,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.payrollService.update(
        id,
        updatePayrollDto,
        req.user.accountId,
      );
      return {
        payload,
        message: "Payroll updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Payroll Controller - update`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("payroll/:id/status")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update payroll status" })
  @ApiParam({ name: "id", description: "Payroll ID" })
  @ApiResponse({
    status: 200,
    description: "Payroll status updated successfully",
  })
  async updatePayrollStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdatePayrollStatusDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const payload = await this.payrollService.updateStatus(
        id,
        updateStatusDto.status,
        req.user.accountId,
        req.user.id,
      );
      return {
        payload,
        message: "Payroll status updated successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Payroll Controller - updateStatus`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("payroll/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Delete payroll" })
  @ApiParam({ name: "id", description: "Payroll ID" })
  @ApiResponse({ status: 200, description: "Payroll deleted successfully" })
  async removePayroll(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      await this.payrollService.remove(id, req.user.accountId);
      return {
        message: "Payroll deleted successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Payroll Controller - remove`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  // ============ TAXES ============

  @Post("taxes/generate")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Generate a tax report" })
  @ApiResponse({
    status: 201,
    description: "Tax report generated successfully",
  })
  async generateTaxReport(
    @Body() createTaxReportDto: CreateTaxReportDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const payload = await this.taxService.generateReport(
        createTaxReportDto,
        req.user.accountId,
        req.user.id,
      );
      return {
        payload,
        message: "Tax report generated successfully",
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      console.error(
        `Error in Tax Controller - generateReport`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("taxes")
  @ApiOperation({ summary: "Get all tax reports with pagination" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "sortBy", required: false })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  @ApiQuery({ name: "type", required: false, enum: TaxReportType })
  @ApiQuery({ name: "status", required: false, enum: TaxReportStatus })
  @ApiResponse({
    status: 200,
    description: "Tax reports retrieved successfully",
  })
  async findAllTaxReports(
    @Query()
    query: PaginationQuery & {
      type?: TaxReportType;
      status?: TaxReportStatus;
    },
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.taxService.findAll(req.user.accountId, query);
      return {
        payload,
        message: "Tax reports fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(`Error in Tax Controller - findAll`, JSON.stringify(error));
      throw error;
    }
  }

  @Get("taxes/stats")
  @ApiOperation({ summary: "Get tax statistics" })
  @ApiResponse({ status: 200, description: "Tax stats retrieved successfully" })
  async getTaxStats(@Req() req: Request & { user: { accountId: string } }) {
    try {
      const payload = await this.taxService.getStats(req.user.accountId);
      return {
        payload,
        message: "Tax statistics fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Tax Controller - getStats`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("taxes/:id")
  @ApiOperation({ summary: "Get tax report by ID" })
  @ApiParam({ name: "id", description: "Tax report ID" })
  @ApiResponse({
    status: 200,
    description: "Tax report retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Tax report not found" })
  async findOneTaxReport(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.taxService.findOne(id, req.user.accountId);
      return {
        payload,
        message: "Tax report fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(`Error in Tax Controller - findOne`, JSON.stringify(error));
      throw error;
    }
  }

  @Patch("taxes/:id/file")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "File a tax report" })
  @ApiParam({ name: "id", description: "Tax report ID" })
  @ApiResponse({ status: 200, description: "Tax report filed successfully" })
  async fileTaxReport(
    @Param("id") id: string,
    @Body() fileTaxReportDto: FileTaxReportDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const payload = await this.taxService.fileReport(
        id,
        fileTaxReportDto,
        req.user.accountId,
        req.user.id,
      );
      return {
        payload,
        message: "Tax report filed successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Tax Controller - fileReport`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Patch("taxes/:id/pay")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Pay a tax report" })
  @ApiParam({ name: "id", description: "Tax report ID" })
  @ApiResponse({ status: 200, description: "Tax report marked as paid" })
  async payTaxReport(
    @Param("id") id: string,
    @Body() payTaxReportDto: PayTaxReportDto,
    @Req() req: Request & { user: { id: string; accountId: string } },
  ) {
    try {
      const payload = await this.taxService.payReport(
        id,
        payTaxReportDto,
        req.user.accountId,
        req.user.id,
      );
      return {
        payload,
        message: "Tax report marked as paid",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Tax Controller - payReport`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Delete("taxes/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Delete tax report" })
  @ApiParam({ name: "id", description: "Tax report ID" })
  @ApiResponse({ status: 200, description: "Tax report deleted successfully" })
  async removeTaxReport(
    @Param("id") id: string,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      await this.taxService.remove(id, req.user.accountId);
      return {
        message: "Tax report deleted successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(`Error in Tax Controller - remove`, JSON.stringify(error));
      throw error;
    }
  }

  // ============ ANALYTICS ============

  @Get("analytics")
  @ApiOperation({ summary: "Get analytics overview" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["daily", "weekly", "monthly", "yearly"],
  })
  @ApiResponse({ status: 200, description: "Analytics retrieved successfully" })
  async getAnalytics(
    @Query() query: { startDate?: string; endDate?: string; period?: string },
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.analyticsService.getAnalytics(
        req.user.accountId,
        query,
      );
      return {
        payload,
        message: "Analytics fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Analytics Controller - getAnalytics`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("analytics/revenue-breakdown")
  @ApiOperation({ summary: "Get revenue breakdown by category" })
  @ApiResponse({
    status: 200,
    description: "Revenue breakdown retrieved successfully",
  })
  async getRevenueBreakdown(
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.analyticsService.getRevenueBreakdown(
        req.user.accountId,
      );
      return {
        payload,
        message: "Revenue breakdown fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Analytics Controller - getRevenueBreakdown`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("analytics/top-customers")
  @ApiOperation({ summary: "Get top customers by revenue" })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of customers to return",
  })
  @ApiResponse({
    status: 200,
    description: "Top customers retrieved successfully",
  })
  async getTopCustomers(
    @Query("limit") limit: number = 10,
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.analyticsService.getTopCustomers(
        req.user.accountId,
        limit,
      );
      return {
        payload,
        message: "Top customers fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Analytics Controller - getTopCustomers`,
        JSON.stringify(error),
      );
      throw error;
    }
  }

  @Get("analytics/sales-trend")
  @ApiOperation({ summary: "Get sales trend over time" })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["daily", "weekly", "monthly", "yearly"],
  })
  @ApiResponse({
    status: 200,
    description: "Sales trend retrieved successfully",
  })
  async getSalesTrend(
    @Query("period")
    period: "daily" | "weekly" | "monthly" | "yearly" = "monthly",
    @Req() req: Request & { user: { accountId: string } },
  ) {
    try {
      const payload = await this.analyticsService.getSalesTrend(
        req.user.accountId,
        period,
      );
      return {
        payload,
        message: "Sales trend fetched successfully",
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.error(
        `Error in Analytics Controller - getSalesTrend`,
        JSON.stringify(error),
      );
      throw error;
    }
  }
}

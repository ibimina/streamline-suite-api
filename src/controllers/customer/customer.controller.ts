import { ApiTags } from "@nestjs/swagger";
import { CustomerService } from "@/services/customer/customer.service";
import { CreateCustomerDto } from "@/models/dto/customer/create-customer.dto";
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";

@ApiTags("customers")
@Controller("customers")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  // Create a new customer
  @Post()
  async create(
    @Body() dto: CreateCustomerDto,
    @Req() req: Request & { user: { id: string; companyId: string } }
  ) {
    try {
      await this.customerService.createCustomer(dto, req.user.companyId);
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

  // Get all customers for a company (with simple pagination)
  @Get("company")
  @HttpCode(HttpStatus.OK)
  async getAllCompanyCustomers(
    @Query("page") page = "1",
    @Query("limit") limit = "25",
    @Req() req: Request & { user: { id: string; companyId: string } },
    @Body() filter: any
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page as any, 10) || 1);
      const limitNum = Math.min(100, parseInt(limit as any, 10) || 25);
      const customers = await this.customerService.getAllCompanyCustomers(
        filter,
        { page: pageNum, limit: limitNum },
        req.user.companyId
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
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async get(
    @Param("id") id: string,
    @Req() req: Request & { user: { id: string; companyId: string } }
  ) {
    try {
      const customer = await this.customerService.getCustomerById(
        id,
        req.user.companyId
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
  @Patch(":id/deactivate")
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Req() req: Request & { user: { id: string; companyId: string } },

    @Param("id") id: string
  ) {
    try {
      await this.customerService.deactivateCompanyCustomer(
        req.user.companyId,
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

  // Delete a company customer (hard delete)
  @Delete(":customerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCompanyCustomer(
    @Req() req: Request & { user: { id: string; companyId: string } },
    @Param("customerId") customerId: string
  ) {
      try {
          await this.customerService.deleteCompanyCustomer(
            req.user.companyId,
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
}

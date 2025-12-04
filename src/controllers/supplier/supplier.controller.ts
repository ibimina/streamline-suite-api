import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { SupplierService } from "@/services/supplier/supplier.service";
import { CreateSupplierDto } from "@/models/dto/supplier/create-supplier.dto";
import { UpdateSupplierDto } from "@/models/dto/supplier/update-supplier.dto";
import { Roles } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";
import { UserRole } from "@/common/types";
import { PaginationQuery } from "@/common/types";

@ApiTags("Suppliers")
@UseGuards(RolesGuard)
@Controller("suppliers")
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
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
  async create(
    @Body() createSupplierDto: CreateSupplierDto,
    @Request() req: { user: { accountId: string; id: string } }
  ) {
    return this.supplierService.create(
      createSupplierDto,
      req.user.accountId,
      req.user.id
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
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
  async findAll(@Query() query: PaginationQuery, @Request() req) {
    return this.supplierService.findAll(req.user.accountId, query);
  }

  @Get("stats")
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
    return this.supplierService.getStats(req.user.accountId);
  }

  @Get("active")
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
    return this.supplierService.getActiveSuppliers(req.user.accountId);
  }

  @Get(":id")
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
  async findOne(@Param("id") id: string, @Request() req) {
    return this.supplierService.findOne(id, req.user.accountId);
  }

  @Patch(":id")
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
  async update(
    @Param("id") id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Request() req
  ) {
    return this.supplierService.update(
      id,
      updateSupplierDto,
      req.user.accountId
    );
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Delete a supplier" })
  @ApiParam({
    name: "id",
    description: "Supplier ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Supplier deleted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Supplier not found",
  })
  async remove(@Param("id") id: string, @Request() req) {
    await this.supplierService.remove(id, req.user.accountId);
    return { message: "Supplier deleted successfully" };
  }
}

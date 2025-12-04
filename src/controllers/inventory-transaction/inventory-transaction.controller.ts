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
import { InventoryTransactionService } from "@/services/inventory-transaction/inventory-transaction.service";
import { CreateInventoryTransactionDto } from "@/models/dto/inventory-transaction/create-inventory-transaction.dto";
import { UpdateInventoryTransactionDto } from "@/models/dto/inventory-transaction/update-inventory-transaction.dto";

import { UserRole } from "@/common/types";
import { PaginationQuery } from "@/common/types";
import { Roles } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";

@ApiTags("Inventory Transactions")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("inventory-transactions")
export class InventoryTransactionController {
  constructor(
    private readonly inventoryTransactionService: InventoryTransactionService
  ) {}

  @Post()
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
  async create(
    @Body() createInventoryTransactionDto: CreateInventoryTransactionDto,
    @Request() req
  ) {
    return this.inventoryTransactionService.create(
      createInventoryTransactionDto,
      req.user.accountId,
      req.user.id
    );
  }

  @Get()
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
  async findAll(
    @Query()
    query: PaginationQuery & {
      productId?: string;
      transactionType?: string;
      status?: string;
      warehouseId?: string;
    },
    @Request() req
  ) {
    return this.inventoryTransactionService.findAll(req.user.accountId, query);
  }

  @Get("stats")
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
  async getStats(@Request() req) {
    return this.inventoryTransactionService.getStats(req.user.accountId);
  }

  @Get("product/:productId/history")
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
  async getTransactionHistory(
    @Param("productId") productId: string,
    @Request() req
  ) {
    return this.inventoryTransactionService.getTransactionHistory(
      productId,
      req.user.accountId
    );
  }

  @Get(":id")
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
  async findOne(@Param("id") id: string, @Request() req) {
    return this.inventoryTransactionService.findOne(id, req.user.accountId);
  }

  @Patch(":id")
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
  async update(
    @Param("id") id: string,
    @Body() updateInventoryTransactionDto: UpdateInventoryTransactionDto,
    @Request() req
  ) {
    return this.inventoryTransactionService.update(
      id,
      updateInventoryTransactionDto,
      req.user.accountId
    );
  }

  @Delete(":id")
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
  async remove(@Param("id") id: string, @Request() req) {
    await this.inventoryTransactionService.remove(id, req.user.accountId);
    return { message: "Inventory transaction deleted successfully" };
  }
}

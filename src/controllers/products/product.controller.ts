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
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ProductService } from "@/services/product/product.service";
import { CreateProductDto } from "@/models/dto/product/create-product.dto";
import { UpdateProductDto } from "@/models/dto/product/update-product.dto";
import { UserRole } from "@/common/types";
import { PaginationQuery } from "@/common/types";
import { Roles } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";

@ApiTags("Products")
@UseGuards(RolesGuard)
@Controller("products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
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
  async create(@Body() createProductDto: CreateProductDto, @Request() req) {
    return this.productService.create(
      createProductDto,
      req.user.accountId,
      req.user.id
    );
  }

  @Get()
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
  async findAll(@Query() query: PaginationQuery, @Request() req) {
    return this.productService.findAll(req.user.accountId, query);
  }

  @Get("stats")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Get product statistics" })
  @ApiResponse({
    status: 200,
    description: "Product statistics retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Account not found",
  })
  async getStats(@Request() req: { user: { accountId: string } }) {
    return this.productService.getStats(req.user.accountId);
  }

  @Get("low-stock")
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
    return this.productService.getLowStockProducts(req.user.accountId);
  }

  @Get(":id")
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
  async findOne(@Param("id") id: string, @Request() req) {
    return this.productService.findOne(id, req.user.accountId);
  }

  @Patch(":id")
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
  async update(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req
  ) {
    return this.productService.update(id, updateProductDto, req.user.accountId);
  }

  @Delete(":id")
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
  async remove(@Param("id") id: string, @Request() req) {
    await this.productService.remove(id, req.user.accountId);
    return { message: "Product deleted successfully" };
  }
}

import { Controller, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CreateUserDto } from "@/models/dto/users/user.dto";
import { UserRole } from "@/common/types";
import { Roles } from "@/common/decorators/roles.decorator";
import { AuthGuard } from "@nestjs/passport";
import { UpdateUserDto } from "@/models/dto/users/update-user.dto";
import { UserService } from "@/services/user/user.service";

@ApiTags("users")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  @ApiResponse({ status: 409, description: "User already exists" })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Request & { user: { id: string; companyId: string } }
  ) {
    return this.userService.registerUser(
      createUserDto,
      req.user.id,
      req.user.companyId
    );
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post("update")
  @ApiOperation({ summary: "Update user information" })
  @ApiResponse({ status: 200, description: "User updated successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async update(
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request & { user: { id: string; companyId: string } }
  ) {
    return this.userService.updateUser(
      updateUserDto,
      req.user.id,
      req.user.companyId
    );
  }
}

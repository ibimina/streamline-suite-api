import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";

import { AuthService } from "@/services/auth/auth.service";
import { GetUser } from "@/common/decorators/get-user.decorator";
import {
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  CreateCompanyandUserDto,
} from "@/models/dto/auth/auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("registerCompany")
  @ApiOperation({ summary: "Register a new company" })
  @ApiResponse({ status: 201, description: "Company registered successfully" })
  @ApiResponse({ status: 409, description: "Company already exists" })
  async registerCompany(
    @Body() createCompanyandUserDto: CreateCompanyandUserDto
  ) {
    return this.authService.registerCompany(createCompanyandUserDto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User login" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({ status: 200, description: "Token refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change password" })
  @ApiBearerAuth("JWT-auth")
  @ApiResponse({ status: 200, description: "Password changed successfully" })
  @ApiResponse({ status: 400, description: "Current password is incorrect" })
  async changePassword(
    @GetUser("id") userId: string,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
  }

  @Post("profile")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get current user profile" })
  @ApiBearerAuth("JWT-auth")
  @ApiResponse({ status: 200, description: "Profile retrieved successfully" })
  async getProfile(@GetUser() user: any) {
    return { user };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "User logout - Invalidates all user tokens (token-free)",
  })
  @ApiBearerAuth("JWT-auth")
  @ApiResponse({
    status: 200,
    description: "Logout successful - all tokens invalidated",
  })
  async logout(@Req() req: any, @GetUser() user: any) {
    // Extract token from Authorization header (not stored, just for signature)
    const token = req.headers.authorization?.replace("Bearer ", "");
    return this.authService.logout(token, user.id);
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Logout from all devices - Sets global logout timestamp",
  })
  @ApiBearerAuth("JWT-auth")
  @ApiResponse({ status: 200, description: "Logged out from all devices" })
  async logoutFromAllDevices(@GetUser() user: any) {
    return this.authService.logoutFromAllDevices(user.id);
  }

  @Post("revoke-token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Revoke tokens - Invalidates all user tokens (no individual token storage)",
  })
  @ApiBearerAuth("JWT-auth")
  @ApiResponse({ status: 200, description: "All tokens revoked successfully" })
  async revokeToken(@Req() req: any, @GetUser() user: any) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    return this.authService.revokeToken(token, user.id);
  }

  @Post("blacklist-stats")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get token invalidation statistics (token-free approach)",
  })
  @ApiBearerAuth("JWT-auth")
  async getBlacklistStats() {
    return this.authService.getBlacklistStats();
  }

}

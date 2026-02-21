import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ObjectId } from "mongoose";
import * as bcrypt from "bcrypt";

import { User, UserDocument } from "@/schemas/user.schema";
import { LoginDto, CreateCompanyandUserDto } from "@/models/dto/auth/auth.dto";
import { TokenFreeBlacklistService } from "../token/token-free-blacklist.service";
import { JwtPayload } from "@/models/interfaces";
import { Account, AccountDocument } from "@/schemas/account.schema";
import { ActivityService } from "../activity/activity.service";
import { ActivityType } from "@/models/enums/shared.enum";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    private jwtService: JwtService,
    private blacklistService: TokenFreeBlacklistService,
    private activityService: ActivityService
  ) {}

  async registerCompany(createCompanyandUserDto: CreateCompanyandUserDto) {
    const existingCompany = await this.accountModel.findOne({
      name: createCompanyandUserDto.email,
    });

    if (existingCompany) {
      throw new ConflictException("Account already exists");
    }

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: createCompanyandUserDto.email,
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // Create account
    const account = new this.accountModel({
      name: createCompanyandUserDto.name,
      email: createCompanyandUserDto.email,
      address: createCompanyandUserDto.address,
      country: createCompanyandUserDto.country,
      industry: createCompanyandUserDto.industry,
      phoneNumber: createCompanyandUserDto.phoneNumber,
      companySize: createCompanyandUserDto.companySize,

    });

    await account.save();
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      createCompanyandUserDto.password,
      saltRounds
    );

    // Create user
    const user = new this.userModel({
      email: createCompanyandUserDto.email,
      password: hashedPassword,
      role: "Admin",
      account: account._id,
      isActive: true,
      firstName: createCompanyandUserDto.firstName,
      lastName: createCompanyandUserDto.lastName,
    });

    await user.save();

    // Link user to account
    await this.accountModel
      .updateOne({ _id: account._id }, { users: [user._id], ownerId: user._id })
      .exec();

    // Generate tokens
    const tokens = await this.generateTokens(user);
    await user.populate({
      path: "account",
      populate: "users",
    });

    const { password, _id, ...userResult } = user.toObject();

    return {
      user: userResult,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userModel
      .findOne({ email })
      .exec();

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        "Invalid credentials or account inactive"
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);

    await user.populate({
        path: "account",
        populate: "users",
      })

    await this.activityService.create({
      account: user.account?._id as any,
      user: user._id,
      type: ActivityType.USER_LOGIN,
      description: "User logged in",
      title: "User Login",
    });

    const { password: _, ...userResult } = user.toObject();

    return {
      user: userResult,
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userModel.findById(payload.id);

      if (!user || !user.isActive) {
        throw new UnauthorizedException("User not found or inactive");
      }

      // Verify token version matches (for token invalidation)
      if (payload.tokenVersion !== user.tokenVersion) {
        throw new UnauthorizedException("Token has been revoked");
      }

      return this.generateTokens(user);
    } catch (error) {
      console.error("Refresh token error:", error);
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user.toObject();
      return result;
    }

    return null;
  }

  private async generateTokens(user: UserDocument) {
    const payload: JwtPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      accountId: user.account.toString(),
      tokenVersion: user.tokenVersion, // Include token version for invalidation
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: "15m" }),
      this.jwtService.signAsync(payload, { expiresIn: "7d" }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Invalidate all existing tokens after password change
    await this.blacklistService.invalidateTokensOnPasswordChange(userId);

    await this.activityService.create({
      account: user.account?._id as any,
      user: user._id,
      type: ActivityType.PASSWORD_CHANGE,
      description: "User changed their password",
      title: "Password Change",
    });

    return { message: "Password changed successfully. Please login again." };
  }

  // Logout methods using token-free blacklisting (no token storage)

  async logout(
    token: string,
    userId: string
  ): Promise<{ message: string; success: boolean }> {
    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        throw new UnauthorizedException("User not found");
      }
      // Increment user's token version - invalidates ALL current tokens
      await this.blacklistService.invalidateAllUserTokens(userId, "logout");

      await this.activityService.create({
        account: user.account as any,
        user: user._id,
        type: ActivityType.USER_LOGOUT,
        description: "User logged out",
        title: "User Logout",
      });

      return {
        message: "Successfully logged out from all devices",
        success: true,
      };
    } catch (error) {
      return {
        message: "Logout completed (token invalidation failed)",
        success: true,
      };
    }
  }

  async logoutFromAllDevices(
    userId: string
  ): Promise<{ message: string; success: boolean }> {
    try {
      // Set global logout timestamp - tokens issued before this are invalid
      await this.blacklistService.setGlobalLogoutTimestamp(
        userId,
        "logout-all"
      );

      return {
        message: "Successfully logged out from all devices",
        success: true,
      };
    } catch (error) {
      throw new BadRequestException("Failed to logout from all devices");
    }
  }

  async revokeToken(
    token: string,
    userId: string
  ): Promise<{ message: string; success: boolean }> {
    try {
      // Since we don't store individual tokens, revoking means invalidating all user tokens
      await this.blacklistService.invalidateAllUserTokens(userId, "security");

      return {
        message: "All user tokens revoked successfully (token-free approach)",
        success: true,
      };
    } catch (error) {
      throw new BadRequestException("Failed to revoke tokens");
    }
  }

  // Get blacklist statistics (for monitoring)
  async getBlacklistStats() {
    return await this.blacklistService.getStats();
  }
}

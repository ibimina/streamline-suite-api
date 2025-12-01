import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JwtService } from "@nestjs/jwt";
import { User, UserDocument } from "@/schemas/user.schema";

@Injectable()
export class TokenFreeBlacklistService {
  private readonly logger = new Logger(TokenFreeBlacklistService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService
  ) {}

  /**
   * Individual logout - increment user's token version
   * This invalidates ALL current tokens for the user
   */
  async invalidateAllUserTokens(
    userId: string,
    reason: "logout" | "security" | "password-change" = "logout"
  ): Promise<void> {
    try {
      await this.userModel.findByIdAndUpdate(userId, {
        $inc: { tokenVersion: 1 },
      });

      this.logger.debug(`All tokens invalidated for user ${userId}: ${reason}`);
    } catch (error) {
      this.logger.error("Failed to invalidate user tokens:", error);
      throw error;
    }
  }

  /**
   * Global logout - set lastGlobalLogout timestamp
   * Tokens issued before this timestamp are invalid
   */
  async setGlobalLogoutTimestamp(
    userId: string,
    reason: "logout-all" | "security" = "logout-all"
  ): Promise<void> {
    try {
      const logoutTimestamp = new Date();

      await this.userModel.findByIdAndUpdate(userId, {
        lastGlobalLogout: logoutTimestamp,
        $inc: { tokenVersion: 1 }, // Also increment version for double protection
      });

      this.logger.debug(
        `Global logout timestamp set for user ${userId}: ${reason}`
      );
    } catch (error) {
      this.logger.error("Failed to set global logout timestamp:", error);
      throw error;
    }
  }

  /**
   * Check if token is valid based on user's token version
   */
  async isTokenVersionValid(
    userId: string,
    tokenVersion: number
  ): Promise<boolean> {
    try {
      const user = await this.userModel
        .findById(userId)
        .select("tokenVersion")
        .lean();

      if (!user) {
        return false; // User doesn't exist
      }

      // Handle existing users without tokenVersion field (treat as version 1)
      const userTokenVersion = user.tokenVersion ?? 1;

      // If user doesn't have tokenVersion, update them with default value
      if (user.tokenVersion === undefined) {
        this.logger.debug(
          `Updating user ${userId} with default tokenVersion: 1`
        );
        await this.userModel.findByIdAndUpdate(userId, { tokenVersion: 1 });
      }

      return userTokenVersion === tokenVersion;
    } catch (error) {
      this.logger.warn("Failed to check token version:", error.message);
      return false; // Fail closed for security
    }
  }

  /**
   * Check if token was issued before user's last global logout
   */
  async isTokenIssuedBeforeGlobalLogout(
    userId: string,
    tokenIssuedAt: number
  ): Promise<boolean> {
    try {
      const user = await this.userModel
        .findById(userId)
        .select("lastGlobalLogout")
        .lean();

      if (!user || !user.lastGlobalLogout) {
        return false; // No global logout recorded
      }

      const tokenIssuedAtMs = tokenIssuedAt * 1000; // Convert JWT iat from seconds to ms
      const globalLogoutMs = user.lastGlobalLogout.getTime();

      return tokenIssuedAtMs < globalLogoutMs;
    } catch (error) {
      this.logger.warn(
        "Failed to check global logout timestamp:",
        error.message
      );
      return false; // Fail open - don't block if DB is down
    }
  }

  /**
   * Password change - increment token version (invalidates all tokens)
   */
  async invalidateTokensOnPasswordChange(userId: string): Promise<void> {
    await this.invalidateAllUserTokens(userId, "password-change");
  }

  /**
   * Security incident - set global logout and increment version
   */
  async securityLogout(userId: string): Promise<void> {
    await this.setGlobalLogoutTimestamp(userId, "security");
  }

  /**
   * Get user's token info (for debugging/admin)
   */
  async getUserTokenInfo(userId: string): Promise<{
    tokenVersion: number;
    lastGlobalLogout: Date | null;
    hasActiveTokens: boolean;
  }> {
    try {
      const user = await this.userModel
        .findById(userId)
        .select("tokenVersion lastGlobalLogout")
        .lean();

      if (!user) {
        return {
          tokenVersion: 0,
          lastGlobalLogout: null,
          hasActiveTokens: false,
        };
      }

      // Consider tokens potentially active if no global logout or recent logout
      const hasActiveTokens =
        !user.lastGlobalLogout ||
        Date.now() - user.lastGlobalLogout.getTime() > 7 * 24 * 60 * 60 * 1000; // 7 days

      return {
        tokenVersion: user.tokenVersion,
        lastGlobalLogout: user.lastGlobalLogout || null,
        hasActiveTokens,
      };
    } catch (error) {
      this.logger.error("Failed to get user token info:", error);
      return {
        tokenVersion: 0,
        lastGlobalLogout: null,
        hasActiveTokens: false,
      };
    }
  }

  /**
   * Bulk invalidate tokens for multiple users (admin function)
   */
  async bulkInvalidateUsers(
    userIds: string[],
    reason: string = "admin-action"
  ): Promise<number> {
    try {
      const result = await this.userModel.updateMany(
        { _id: { $in: userIds } },
        {
          $inc: { tokenVersion: 1 },
          lastGlobalLogout: new Date(),
        }
      );

      this.logger.log(
        `Bulk invalidated tokens for ${result.modifiedCount} users: ${reason}`
      );
      return result.modifiedCount || 0;
    } catch (error) {
      this.logger.error("Failed bulk token invalidation:", error);
      return 0;
    }
  }

  /**
   * Get statistics (no actual tokens stored, so just user counts)
   */
  async getStats(): Promise<{
    totalUsers: number;
    usersWithGlobalLogout: number;
    recentLogouts: number; // Within last 24h
  }> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [totalUsers, usersWithGlobalLogout, recentLogouts] =
        await Promise.all([
          this.userModel.countDocuments(),
          this.userModel.countDocuments({
            lastGlobalLogout: { $exists: true },
          }),
          this.userModel.countDocuments({
            lastGlobalLogout: { $gte: yesterday },
          }),
        ]);

      return {
        totalUsers,
        usersWithGlobalLogout,
        recentLogouts,
      };
    } catch (error) {
      this.logger.error("Failed to get blacklist stats:", error);
      return {
        totalUsers: 0,
        usersWithGlobalLogout: 0,
        recentLogouts: 0,
      };
    }
  }

  /**
   * Clean up old global logout timestamps (optional housekeeping)
   */
  async cleanupOldLogouts(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(
        Date.now() - olderThanDays * 24 * 60 * 60 * 1000
      );

      const result = await this.userModel.updateMany(
        { lastGlobalLogout: { $lt: cutoffDate } },
        { $unset: { lastGlobalLogout: 1 } }
      );

      this.logger.log(
        `Cleaned up ${result.modifiedCount} old global logout timestamps`
      );
      return result.modifiedCount || 0;
    } catch (error) {
      this.logger.error("Failed to cleanup old logouts:", error);
      return 0;
    }
  }
}

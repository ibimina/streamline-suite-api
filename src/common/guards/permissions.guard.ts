import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PermissionName, RoleName } from "@/models/enums/shared.enum";
import { PERMISSIONS_KEY } from "@/common/decorators/permissions.decorator";
import { getUserPermissions } from "@/config/permissions.config";

export interface JwtPayloadWithPermissions {
  id: string;
  email: string;
  role: RoleName;
  accountId?: string;
  tokenVersion?: number;
  permissionMode?: "inherit" | "custom";
  permissions?: PermissionName[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Get required permissions from decorator (check handler first, then class)
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionName[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Authentication token required");
    }

    try {
      const user = await this.jwtService.verifyAsync<JwtPayloadWithPermissions>(
        token,
        {
          secret: process.env.JWT_SECRET,
        },
      );

      // Attach user to request for use in handlers
      request["user"] = user;

      // Get user's effective permissions based on permissionMode
      // If mode is 'custom', use custom permissions; otherwise use role-based
      const customPermissions =
        user.permissionMode === "custom" ? user.permissions : undefined;
      const userPermissions = getUserPermissions(
        user.role as RoleName,
        customPermissions,
      );

      // Check if user has ALL required permissions
      const hasAllRequired = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasAllRequired) {
        throw new ForbiddenException(
          "You do not have permission to perform this action",
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}

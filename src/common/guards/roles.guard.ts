import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@/common/types";
import { Request } from 'express';
import { JwtService } from "@nestjs/jwt";
import { RoleName } from "@/models/enums/shared.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector,
        private readonly jwtService: JwtService,

  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      "roles",
      [context.getHandler(), context.getClass()]
    );

    const token = this.extractTokenFromHeader(request);
    console.log("================= token", token)
    console.log('=====================requiredRoles', requiredRoles);

      if (!token || !requiredRoles) {
      throw new UnauthorizedException();
    }
    try {
      const user = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      request['user'] = user;
      console.log('=====================userRoleNames', user.role);
      return requiredRoles.includes(user.role);
      // return requiredRoles.some((role: UserRole) => user.role?.includes(role));
    } catch (error) {
      console.log('====error in canActivate', JSON.stringify(error));
      throw new UnauthorizedException();
    }
  }
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}

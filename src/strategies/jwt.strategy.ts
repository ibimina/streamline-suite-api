import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "../schemas/user.schema";
import { TokenFreeBlacklistService } from "../services/token/token-free-blacklist.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId?: string;
  tokenVersion?: number;
  iat?: number; // issued at
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private blacklistService: TokenFreeBlacklistService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") || "your-secret-key",
      passReqToCallback: true, // Enable access to request object
    });
  }

  async validate(req: any, payload: JwtPayload) {
    // Extract token from request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    const user = await this.userModel
      .findById(payload.sub)
      .populate("companyId")
      .exec();

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User not found or inactive");
    }

    // Check token version (invalidates all tokens when user logs out)
    // For existing tokens without tokenVersion, use default value of 1
    const tokenVersion = payload.tokenVersion ?? 1;

    if (
      !(await this.blacklistService.isTokenVersionValid(
        payload.sub,
        tokenVersion
      ))
    ) {
      console.log(
        `Token version validation failed for user ${payload.sub}: token has version ${tokenVersion}`
      );
      throw new UnauthorizedException("Token version is invalid");
    }

    // Check if token was issued before user's last global logout
    if (
      payload.iat &&
      (await this.blacklistService.isTokenIssuedBeforeGlobalLogout(
        payload.sub,
        payload.iat
      ))
    ) {
      throw new UnauthorizedException("Token was issued before logout");
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId?.toString(),
      company: user.companyId,
    };
  }
}

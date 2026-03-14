import { PermissionName } from "@/models/enums/shared.enum";

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  accountId?: string;
  tokenVersion?: number;
  permissionMode?: "inherit" | "custom"; // How permissions are determined
  permissions?: PermissionName[]; // User's custom permissions (if any)
  iat?: number; // issued at
}

import { SetMetadata } from "@nestjs/common";
import { PermissionName } from "@/models/enums/shared.enum";

export const PERMISSIONS_KEY = "permissions";

/**
 * Decorator to specify required permissions for a route handler or controller
 * Usage: @Permissions(PermissionName.MANAGE_USERS, PermissionName.VIEW_REPORTS)
 */
export const Permissions = (...permissions: PermissionName[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

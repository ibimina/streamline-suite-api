import { PermissionName, RoleName } from "@/models/enums/shared.enum";

/**
 * Role-Permission Mapping
 * Defines default permissions for each role.
 * Users can have custom permissions that override these defaults.
 */
export const ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  // Full system access
  [RoleName.Admin]: Object.values(PermissionName),

  // Owner-level access (same as Admin)
  [RoleName.BusinessOwner]: Object.values(PermissionName),

  // Management access - can manage most operations except system settings
  [RoleName.Manager]: [
    PermissionName.VIEW_DASHBOARD,
    PermissionName.VIEW_REPORTS,
    // Inventory & Products
    PermissionName.MANAGE_INVENTORY,
    PermissionName.VIEW_INVENTORY,
    PermissionName.MANAGE_PRODUCTS,
    PermissionName.VIEW_PRODUCTS,
    // Suppliers
    PermissionName.MANAGE_SUPPLIERS,
    PermissionName.VIEW_SUPPLIERS,
    // Orders
    PermissionName.PROCESS_ORDERS,
    PermissionName.CREATE_INVOICES,
    PermissionName.VIEW_INVOICES,
    PermissionName.APPROVE_INVOICES,
    PermissionName.CREATE_QUOTATIONS,
    PermissionName.VIEW_QUOTATIONS,
    // Customers
    PermissionName.MANAGE_CUSTOMERS,
    PermissionName.VIEW_CUSTOMERS,
    // Finances
    PermissionName.VIEW_FINANCES,
    // Expenses
    PermissionName.SUBMIT_EXPENSES,
    PermissionName.APPROVE_EXPENSES,
    PermissionName.VIEW_EXPENSES,
    // Payroll
    PermissionName.VIEW_PAYROLL,
    // Taxes
    PermissionName.VIEW_TAXES,
  ],

  // Finance/Accounting access
  [RoleName.Accountant]: [
    PermissionName.VIEW_DASHBOARD,
    PermissionName.VIEW_REPORTS,
    // View only for inventory
    PermissionName.VIEW_INVENTORY,
    PermissionName.VIEW_PRODUCTS,
    PermissionName.VIEW_SUPPLIERS,
    // Invoices (view and create)
    PermissionName.VIEW_INVOICES,
    PermissionName.CREATE_INVOICES,
    PermissionName.APPROVE_INVOICES,
    PermissionName.VIEW_QUOTATIONS,
    // Customers
    PermissionName.VIEW_CUSTOMERS,
    // Full finance access
    PermissionName.MANAGE_FINANCES,
    PermissionName.VIEW_FINANCES,
    // Expenses
    PermissionName.SUBMIT_EXPENSES,
    PermissionName.APPROVE_EXPENSES,
    PermissionName.VIEW_EXPENSES,
    // Payroll
    PermissionName.MANAGE_PAYROLL,
    PermissionName.VIEW_PAYROLL,
    // Taxes
    PermissionName.MANAGE_TAXES,
    PermissionName.VIEW_TAXES,
  ],

  // Sales team access
  [RoleName.Sale]: [
    PermissionName.VIEW_DASHBOARD,
    // View products for sales
    PermissionName.VIEW_PRODUCTS,
    PermissionName.VIEW_INVENTORY,
    // Orders - full access to create and process
    PermissionName.PROCESS_ORDERS,
    PermissionName.CREATE_INVOICES,
    PermissionName.VIEW_INVOICES,
    PermissionName.CREATE_QUOTATIONS,
    PermissionName.VIEW_QUOTATIONS,
    // Customer management
    PermissionName.MANAGE_CUSTOMERS,
    PermissionName.VIEW_CUSTOMERS,
    // View expenses
    PermissionName.VIEW_EXPENSES,
    PermissionName.SUBMIT_EXPENSES,
  ],

  // Procurement team access
  [RoleName.Procurement]: [
    PermissionName.VIEW_DASHBOARD,
    // Full inventory and product management
    PermissionName.MANAGE_INVENTORY,
    PermissionName.VIEW_INVENTORY,
    PermissionName.MANAGE_PRODUCTS,
    PermissionName.VIEW_PRODUCTS,
    // Supplier management
    PermissionName.MANAGE_SUPPLIERS,
    PermissionName.VIEW_SUPPLIERS,
    // View orders
    PermissionName.VIEW_INVOICES,
    PermissionName.VIEW_QUOTATIONS,
    // Expenses
    PermissionName.SUBMIT_EXPENSES,
    PermissionName.VIEW_EXPENSES,
  ],

  // Warehouse operations
  [RoleName.Warehouse]: [
    PermissionName.VIEW_DASHBOARD,
    // Inventory management
    PermissionName.MANAGE_INVENTORY,
    PermissionName.VIEW_INVENTORY,
    // View products
    PermissionName.VIEW_PRODUCTS,
    // View suppliers
    PermissionName.VIEW_SUPPLIERS,
  ],

  // Basic staff access
  [RoleName.Staff]: [
    PermissionName.VIEW_DASHBOARD,
    // View only permissions
    PermissionName.VIEW_PRODUCTS,
    PermissionName.VIEW_INVENTORY,
    PermissionName.VIEW_INVOICES,
    PermissionName.VIEW_QUOTATIONS,
    PermissionName.VIEW_CUSTOMERS,
  ],
};

/**
 * Get permissions for a user based on their role and custom permissions
 * Custom permissions override role defaults if provided
 */
export function getUserPermissions(
  role: RoleName,
  customPermissions?: PermissionName[],
): PermissionName[] {
  // If user has custom permissions, use those
  if (customPermissions && customPermissions.length > 0) {
    return customPermissions;
  }
  // Otherwise, use role defaults
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  role: RoleName,
  permission: PermissionName,
  customPermissions?: PermissionName[],
): boolean {
  const userPermissions = getUserPermissions(role, customPermissions);
  return userPermissions.includes(permission);
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  role: RoleName,
  permissions: PermissionName[],
  customPermissions?: PermissionName[],
): boolean {
  const userPermissions = getUserPermissions(role, customPermissions);
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  role: RoleName,
  permissions: PermissionName[],
  customPermissions?: PermissionName[],
): boolean {
  const userPermissions = getUserPermissions(role, customPermissions);
  return permissions.some((p) => userPermissions.includes(p));
}

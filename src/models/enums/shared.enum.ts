export enum RoleName {
  Admin = 'Admin',
  Sale = "Sale",
  Procurement = 'Procurement',
  Accountant = 'Accountant',
  BusinessOwner = 'BusinessOwner',
  Staff = "Staff",
  Warehouse = 'Warehouse'
}

export enum CustomerStatus {
ACTIVE = 'active',
INACTIVE = 'inactive',
SUSPENDED = 'suspended',
}

export enum PermissionName {
  VIEW_DASHBOARD = 'view_dashboard',
  MANAGE_USERS = 'manage_users',
  VIEW_REPORTS = 'view_reports',
  MANAGE_INVENTORY = 'manage_inventory',
  PROCESS_ORDERS = 'process_orders',
  MANAGE_FINANCES = 'manage_finances',
  
}

export enum ActivityType {
  INVOICE_CREATED = 'invoice_created',
  INVOICE_SENT = 'invoice_sent',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_OVERDUE = 'invoice_overdue',
  QUOTATION_CREATED = 'quotation_created',
  QUOTATION_SENT = 'quotation_sent',
  QUOTATION_ACCEPTED = 'quotation_accepted',
  QUOTATION_DECLINED = 'quotation_declined',
  QUOTATION_CONVERTED = 'quotation_converted',
  PRODUCT_CREATED = 'product_created',
  PRODUCT_UPDATED = 'product_updated',
  PRODUCT_LOW_STOCK = 'product_low_stock',
  CUSTOMER_CREATED = 'customer_created',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  ACCOUNT_UPDATED = 'account_updated',
  EXPENSE_CREATED = 'expense_created',
  PAYMENT_RECEIVED = 'payment_received',
  PASSWORD_CHANGE = 'password_change',
}

export enum ActivityPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
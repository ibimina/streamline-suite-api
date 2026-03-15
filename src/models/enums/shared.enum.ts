export enum RoleName {
  Admin = "Admin",
  Sale = "Sale",
  Procurement = "Procurement",
  Accountant = "Accountant",
  BusinessOwner = "BusinessOwner",
  Staff = "Staff",
  Warehouse = "Warehouse",
  Manager = "Manager",
}

export enum CustomerStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export enum PermissionName {
  // Dashboard
  VIEW_DASHBOARD = "view_dashboard",

  // User Management
  MANAGE_USERS = "manage_users",

  // Reports & Analytics
  VIEW_REPORTS = "view_reports",

  // Inventory & Products
  MANAGE_INVENTORY = "manage_inventory",
  VIEW_INVENTORY = "view_inventory",
  MANAGE_PRODUCTS = "manage_products",
  VIEW_PRODUCTS = "view_products",

  // Suppliers
  MANAGE_SUPPLIERS = "manage_suppliers",
  VIEW_SUPPLIERS = "view_suppliers",

  // Orders (Invoices & Quotations)
  PROCESS_ORDERS = "process_orders",
  CREATE_INVOICES = "create_invoices",
  VIEW_INVOICES = "view_invoices",
  APPROVE_INVOICES = "approve_invoices",
  CREATE_QUOTATIONS = "create_quotations",
  VIEW_QUOTATIONS = "view_quotations",

  // Customers
  MANAGE_CUSTOMERS = "manage_customers",
  VIEW_CUSTOMERS = "view_customers",

  // Finances
  MANAGE_FINANCES = "manage_finances",
  VIEW_FINANCES = "view_finances",

  // Expenses
  SUBMIT_EXPENSES = "submit_expenses",
  APPROVE_EXPENSES = "approve_expenses",
  VIEW_EXPENSES = "view_expenses",

  // Payroll
  MANAGE_PAYROLL = "manage_payroll",
  VIEW_PAYROLL = "view_payroll",

  // Taxes
  MANAGE_TAXES = "manage_taxes",
  VIEW_TAXES = "view_taxes",

  // Settings
  MANAGE_SETTINGS = "manage_settings",
}

export enum ActivityType {
  INVOICE_CREATED = "invoice_created",
  INVOICE_SENT = "invoice_sent",
  INVOICE_PAID = "invoice_paid",
  INVOICE_OVERDUE = "invoice_overdue",
  QUOTATION_CREATED = "quotation_created",
  QUOTATION_SENT = "quotation_sent",
  QUOTATION_ACCEPTED = "quotation_accepted",
  QUOTATION_DECLINED = "quotation_declined",
  QUOTATION_CONVERTED = "quotation_converted",
  QUOTATION_EXPIRED = "quotation_expired",
  PRODUCT_CREATED = "product_created",
  PRODUCT_UPDATED = "product_updated",
  PRODUCT_LOW_STOCK = "product_low_stock",
  CUSTOMER_CREATED = "customer_created",
  USER_LOGIN = "user_login",
  USER_LOGOUT = "user_logout",
  ACCOUNT_UPDATED = "account_updated",
  EXPENSE_CREATED = "expense_created",
  PAYMENT_RECEIVED = "payment_received",
  PASSWORD_CHANGE = "password_change",
}

export enum ActivityPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

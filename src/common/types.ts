// Common types and interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export enum UserRole {
  ADMIN = "Admin",
  MANAGER = "Manager",
  STAFF = "Staff",
}

export enum InvoiceStatus {
  DRAFT = "Draft",
  SENT = "Sent",
  PAID = "Paid",
  PARTIAL = "Partial",
  OVERDUE = "Overdue",
  CANCELLED = "Cancelled",
}

export enum QuotationStatus {
  DRAFT = "Draft",
  SENT = "Sent",
  ACCEPTED = "Accepted",
  REJECTED = "Rejected",
  EXPIRED = "Expired",
}

export enum ExpenseCategory {
  OFFICE_SUPPLIES = "Office Supplies",
  TRAVEL = "Travel",
  UTILITIES = "Utilities",
  MARKETING = "Marketing",
  SOFTWARE = "Software",
  OTHER = "Other",
}

export interface ItemDetails {
  description: string;
  quantity: number;
  unitPrice: number;

}

export interface QuotationItemDetails {
  description: string;
  quantity: number;
  unitPrice: number;
  sellingPricePercentage: number;
  costPrice: number;
}

export enum InventoryTransactionStatus {

  PURCHASE = "purchase", // Goods received
  SALE = "sale", // Goods sold
  RETURN_FROM_CUSTOMER = "return_from_customer",
  RETURN_TO_SUPPLIER = "return_to_supplier",
  ADJUSTMENT = "adjustment", // Damage, theft, correction
  TRANSFER = "transfer", // Future: warehouse to warehouse
  PRODUCTION_IN = "production_in", // Future: manufacturing
  PRODUCTION_OUT = "production_out",
}

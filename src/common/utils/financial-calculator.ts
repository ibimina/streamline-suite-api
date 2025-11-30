import { Injectable } from "@nestjs/common";

// Financial calculation utility class
export class FinancialCalculator {
  /**
   * Calculate subtotal from items (quantity * unitPrice)
   */
  static calculateSubtotal(
    items: Array<{ quantity: number; unitPrice: number }>
  ): number {
    return items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      return sum + itemTotal;
    }, 0);
  }

  /**
   * Calculate tax amount from items (using taxRate per item)
   */
  static calculateTaxAmount(
    items: Array<{ quantity: number; unitPrice: number; taxRate?: number }>
  ): number {
    return items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const taxRate = item.taxRate || 0;
      const itemTax = (itemTotal * taxRate) / 100;
      return sum + itemTax;
    }, 0);
  }

  /**
   * Calculate VAT (Value Added Tax) - added to customer invoice
   */
  static calculateVAT(subtotal: number, vatRate: number = 0): number {
    return (subtotal * vatRate) / 100;
  }

  /**
   * Calculate Withholding Tax - deducted from revenue (affects profit)
   */
  static calculateWithholdingTax(
    subtotal: number,
    whtRate: number = 0
  ): number {
    return (subtotal * whtRate) / 100;
  }

  /**
   * Calculate discount amount
   */
  static calculateDiscountAmount(
    subtotal: number,
    discount: number,
    discountType: "percentage" | "fixed" = "fixed"
  ): number {
    if (discountType === "percentage") {
      return (subtotal * discount) / 100;
    }
    return discount;
  }

  /**
   * Calculate final total with VAT and withholding tax
   * VAT is added to customer total, withholding tax affects what we receive
   */
  static calculateTotal(
    subtotal: number,
    taxAmount: number = 0,
    discountAmount: number = 0,
    vatAmount: number = 0
  ): number {
    // Customer pays: subtotal + itemTax + VAT - discount
    return subtotal + taxAmount + vatAmount - discountAmount;
  }

  /**
   * Calculate net amount we actually receive (after withholding tax deduction)
   */
  static calculateNetReceivable(
    total: number,
    withholdingTaxAmount: number = 0
  ): number {
    // What we actually receive: total - withholding tax
    return total - withholdingTaxAmount;
  }

  /**
   * Calculate total cost from items (quantity * costPrice)
   */
  static calculateTotalCost(
    items: Array<{ quantity: number; costPrice?: number }>
  ): number {
    return items.reduce((sum, item) => {
      const cost = item.costPrice || 0;
      return sum + item.quantity * cost;
    }, 0);
  }

  /**
   * Calculate profit from revenue and cost
   */
  static calculateProfit(revenue: number, cost: number): number {
    return revenue - cost;
  }

  /**
   * Calculate profit margin percentage
   */
  static calculateProfitMargin(profit: number, revenue: number): number {
    if (revenue === 0) return 0;
    return (profit / revenue) * 100;
  }

  /**
   * Calculate markup percentage (profit over cost)
   */
  static calculateMarkup(profit: number, cost: number): number {
    if (cost === 0) return 0;
    return (profit / cost) * 100;
  }

  /**
   * Calculate item-level profit details
   */
  static calculateItemProfit(
    quantity: number,
    unitPrice: number,
    costPrice: number = 0
  ) {
    const revenue = quantity * unitPrice;
    const cost = quantity * costPrice;
    const profit = revenue - cost;
    const margin = this.calculateProfitMargin(profit, revenue);
    const markup = this.calculateMarkup(profit, cost);

    return {
      revenue: this.roundToTwoDecimals(revenue),
      cost: this.roundToTwoDecimals(cost),
      profit: this.roundToTwoDecimals(profit),
      margin: this.roundToTwoDecimals(margin),
      markup: this.roundToTwoDecimals(markup),
    };
  }

  /**
   * Calculate all financial values including VAT, withholding tax, and profit tracking
   */
  static calculateFinancials(
    items: Array<{ quantity: number; unitPrice: number; costPrice?: number }>,
    discount: number = 0,
    discountType: "percentage" | "fixed" = "fixed",
    taxRate?: number,
    vatRate: number = 0,
    whtRate: number = 0
  ) {
    // Silent validation with logging (never throw errors to users)
    if (!items || items.length === 0) {
      console.warn(
        "[FINANCIAL_CALCULATION] Empty items array provided, returning zero values"
      );
      return {
        subtotal: 0,
        taxAmount: 0,
        vatAmount: 0,
        withholdingTaxAmount: 0,
        discountAmount: 0,
        total: 0,
        netReceivable: 0,
        totalCost: 0,
        totalProfit: 0,
        netProfit: 0,
        overallMargin: 0,
        netMargin: 0,
        overallMarkup: 0,
      };
    }

    // Clean and validate items silently
    const validItems = items.filter((item, index) => {
      if (item.quantity <= 0) {
        console.warn(
          `[FINANCIAL_CALCULATION] Item ${index + 1}: Invalid quantity ${item.quantity}, skipping`
        );
        return false;
      }
      if (item.unitPrice < 0) {
        console.warn(
          `[FINANCIAL_CALCULATION] Item ${index + 1}: Negative unitPrice ${item.unitPrice}, using 0`
        );
        item.unitPrice = 0;
      }
      if (item.costPrice && item.costPrice < 0) {
        console.warn(
          `[FINANCIAL_CALCULATION] Item ${index + 1}: Negative costPrice ${item.costPrice}, using 0`
        );
        item.costPrice = 0;
      }
      return true;
    });

    // Validate tax rates
    if (taxRate && (taxRate < 0 || taxRate > 100)) {
      console.warn(
        `[FINANCIAL_CALCULATION] Invalid tax rate ${taxRate}, using 0`
      );
      taxRate = 0;
    }
    if (vatRate < 0 || vatRate > 100) {
      console.warn(
        `[FINANCIAL_CALCULATION] Invalid VAT rate ${vatRate}, using 0`
      );
      vatRate = 0;
    }
    if (whtRate < 0 || whtRate > 100) {
      console.warn(
        `[FINANCIAL_CALCULATION] Invalid WHT rate ${whtRate}, using 0`
      );
      whtRate = 0;
    }

    if (validItems.length === 0) {
      console.warn(
        "[FINANCIAL_CALCULATION] No valid items after filtering, returning zero values"
      );
      return {
        subtotal: 0,
        taxAmount: 0,
        vatAmount: 0,
        withholdingTaxAmount: 0,
        discountAmount: 0,
        total: 0,
        netReceivable: 0,
        totalCost: 0,
        totalProfit: 0,
        netProfit: 0,
        overallMargin: 0,
        netMargin: 0,
        overallMarkup: 0,
      };
    }

    // Basic calculations
    const subtotal = this.calculateSubtotal(validItems);
    const itemTaxAmount = this.calculateTaxAmount(
      validItems.map((item) => ({
        ...item,
        taxRate: taxRate || 0,
      }))
    );
    const discountAmount = this.calculateDiscountAmount(
      subtotal,
      discount,
      discountType
    );

    // Tax calculations
    const vatAmount = this.calculateVAT(subtotal - discountAmount, vatRate);
    const withholdingTaxAmount = this.calculateWithholdingTax(
      subtotal - discountAmount,
      whtRate
    );

    // Total calculations
    const total = this.calculateTotal(
      subtotal,
      itemTaxAmount,
      discountAmount,
      vatAmount
    );
    const netReceivable = this.calculateNetReceivable(
      total,
      withholdingTaxAmount
    );

    // Profit calculations
    const totalCost = this.calculateTotalCost(validItems);
    const grossRevenue = subtotal - discountAmount; // Revenue after discount
    const grossProfit = this.calculateProfit(grossRevenue, totalCost);

    // Net profit after withholding tax deduction
    const netRevenue = grossRevenue - withholdingTaxAmount;
    const netProfit = this.calculateProfit(netRevenue, totalCost);

    // Profit margins
    const overallMargin = this.calculateProfitMargin(grossProfit, grossRevenue);
    const netMargin = this.calculateProfitMargin(netProfit, netRevenue);
    const overallMarkup = this.calculateMarkup(grossProfit, totalCost);

    // Ensure non-negative values
    const finalTotal = Math.max(0, total);
    const finalNetReceivable = Math.max(0, netReceivable);

    if (total < 0) {
      console.warn(
        `[FINANCIAL_CALCULATION] Negative total ${total} corrected to 0`
      );
    }

    return {
      // Basic financials
      subtotal: this.roundToTwoDecimals(subtotal),
      taxAmount: this.roundToTwoDecimals(itemTaxAmount),
      vatAmount: this.roundToTwoDecimals(vatAmount),
      withholdingTaxAmount: this.roundToTwoDecimals(withholdingTaxAmount),
      discountAmount: this.roundToTwoDecimals(discountAmount),
      total: this.roundToTwoDecimals(finalTotal),
      netReceivable: this.roundToTwoDecimals(finalNetReceivable),

      // Profit tracking
      totalCost: this.roundToTwoDecimals(totalCost),
      totalProfit: this.roundToTwoDecimals(grossProfit),
      netProfit: this.roundToTwoDecimals(netProfit),
      overallMargin: this.roundToTwoDecimals(overallMargin),
      netMargin: this.roundToTwoDecimals(netMargin),
      overallMarkup: this.roundToTwoDecimals(overallMarkup),
    };
  }

  /**
   * Round to 2 decimal places for currency
   */
  static roundToTwoDecimals(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Calculate item-level totals with tax and profit details
   */
  static calculateItemTotals(
    items: Array<{
      quantity: number;
      unitPrice: number;
      costPrice?: number;
    }>,
    taxRate?: number
  ) {
    return items.map((item) => {
      const revenue = item.quantity * item.unitPrice;
      const taxAmount = (revenue * taxRate) / 100;
      const totalWithTax = revenue + taxAmount;

      // Profit calculations
      const profit = this.calculateItemProfit(
        item.quantity,
        item.unitPrice,
        item.costPrice || 0
      );

      return {
        ...item,
        amount: this.roundToTwoDecimals(revenue),
        taxAmount: this.roundToTwoDecimals(taxAmount),
        totalWithTax: this.roundToTwoDecimals(totalWithTax),
        ...profit,
      };
    });
  }

  /**
   * Validate financial data
   */
  static validateFinancialData(data: {
    items: Array<{ quantity: number; unitPrice: number; taxRate?: number }>;
    subtotal?: number;
    taxAmount?: number;
    total?: number;
    discount?: number;
  }): { isValid: boolean; correctedData: any } {
    const calculated = this.calculateFinancials(data.items, data.discount || 0);

    // Allow small rounding differences (0.01)
    const tolerance = 0.01;
    let hasDiscrepancies = false;

    if (
      data.subtotal !== undefined &&
      Math.abs(data.subtotal - calculated.subtotal) > tolerance
    ) {
      console.warn(
        `[FINANCIAL_VALIDATION] Subtotal corrected: ${data.subtotal} → ${calculated.subtotal}`
      );
      hasDiscrepancies = true;
    }

    if (
      data.taxAmount !== undefined &&
      Math.abs(data.taxAmount - calculated.taxAmount) > tolerance
    ) {
      console.warn(
        `[FINANCIAL_VALIDATION] Tax amount corrected: ${data.taxAmount} → ${calculated.taxAmount}`
      );
      hasDiscrepancies = true;
    }

    if (
      data.total !== undefined &&
      Math.abs(data.total - calculated.total) > tolerance
    ) {
      console.warn(
        `[FINANCIAL_VALIDATION] Total corrected: ${data.total} → ${calculated.total}`
      );
      hasDiscrepancies = true;
    }

    return {
      isValid: !hasDiscrepancies,
      correctedData: calculated,
    };
  }
}

// Usage in Invoice/Quotation Services
@Injectable()
export class BaseFinancialService {
  /**
   * Process and validate financial calculations
   */
  protected processFinancialCalculations(
    items: Array<{
      quantity: number;
      unitPrice: number;
      costPrice?: number;
      taxRate?: number;
    }>,
    providedDiscount: number = 0,
    discountType: "percentage" | "fixed" = "fixed",
    defaultTaxRate?: number,
    vatRate: number = 0,
    whtRate: number = 0
  ) {
    // Calculate server-side values - ALWAYS use these (no client validation needed)
    const calculated = FinancialCalculator.calculateFinancials(
      items,
      providedDiscount,
      discountType,
      defaultTaxRate,
      vatRate,
      whtRate
    );

    // Log calculation details for monitoring
    console.log(
      `[FINANCIAL_SERVICE] Calculated: subtotal=${calculated.subtotal}, vat=${calculated.vatAmount}, wht=${calculated.withholdingTaxAmount}, total=${calculated.total}, netReceivable=${calculated.netReceivable}, netProfit=${calculated.netProfit}, netMargin=${calculated.netMargin}%`
    );

    // Always return server-calculated values (never trust client)
    return calculated;
  }

  /**
   * Generate financial summary for response
   */
  protected generateFinancialSummary(
    subtotal: number,
    taxAmount: number,
    discountAmount: number,
    total: number,
    vatAmount: number = 0,
    withholdingTaxAmount: number = 0,
    netReceivable: number = 0,
    totalCost: number = 0,
    totalProfit: number = 0,
    netProfit: number = 0,
    overallMargin: number = 0,
    netMargin: number = 0,
    overallMarkup: number = 0,
    currency: string = "USD"
  ) {
    return {
      subtotal: {
        amount: subtotal,
        formatted: this.formatCurrency(subtotal, currency),
      },
      itemTax: {
        amount: taxAmount,
        formatted: this.formatCurrency(taxAmount, currency),
      },
      vat: {
        amount: vatAmount,
        formatted: this.formatCurrency(vatAmount, currency),
      },
      withholdingTax: {
        amount: withholdingTaxAmount,
        formatted: this.formatCurrency(withholdingTaxAmount, currency),
      },
      discount: {
        amount: discountAmount,
        formatted: this.formatCurrency(discountAmount, currency),
      },
      total: {
        amount: total,
        formatted: this.formatCurrency(total, currency),
        description: "Total amount customer pays",
      },
      netReceivable: {
        amount: netReceivable,
        formatted: this.formatCurrency(netReceivable, currency),
        description: "Amount we actually receive (after WHT deduction)",
      },
      profit: {
        totalCost: {
          amount: totalCost,
          formatted: this.formatCurrency(totalCost, currency),
        },
        grossProfit: {
          amount: totalProfit,
          formatted: this.formatCurrency(totalProfit, currency),
          description: "Profit before withholding tax",
        },
        netProfit: {
          amount: netProfit,
          formatted: this.formatCurrency(netProfit, currency),
          description: "Actual profit after withholding tax deduction",
        },
        grossMargin: `${overallMargin.toFixed(2)}%`,
        netMargin: `${netMargin.toFixed(2)}%`,
        markup: `${overallMarkup.toFixed(2)}%`,
      },
      currency,
    };
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }
}

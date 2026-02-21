import { Injectable } from "@nestjs/common";

/**
 * Financial calculation utility class
 * Follows industry-standard accounting practices:
 * - WHT applied to net amount (before VAT) per tax authority guidelines
 * - Profit margin calculated on revenue (selling price after discount)
 * - Markup calculated on cost
 * - Banker's rounding for currency precision
 */
export class FinancialCalculator {
  /**
   * Calculate financials for a single quotation item
   * Industry-standard calculation flow:
   * 1. Line Subtotal = Quantity × Unit Price
   * 2. Discount = Line Subtotal × Discount%
   * 3. Net Amount = Line Subtotal - Discount (taxable amount)
   * 4. VAT = Net Amount × VAT%
   * 5. WHT = Net Amount × WHT% (WHT is on gross, not including VAT)
   * 6. Gross Total = Net Amount + VAT
   * 7. Net Receivable = Gross Total - WHT
   */
  static calculateQuotationItem(
    item: {
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      vatRate: number;
      unitCost: number;
    },
    whtRate: number = 0,
  ) {
    // Step 1-3: Calculate line amount after discount
    const lineSubtotal = item.quantity * item.unitPrice;
    const discountAmount = (lineSubtotal * (item.discountPercent || 0)) / 100;
    const netAmount = lineSubtotal - discountAmount;

    // Step 4: VAT on net amount
    const vatAmount = (netAmount * item.vatRate) / 100;

    // Step 5: WHT on net amount (BEFORE VAT - industry standard)
    const whtAmount = (netAmount * whtRate) / 100;

    // Step 6-7: Totals
    const grossTotal = netAmount + vatAmount;
    const netReceivable = grossTotal - whtAmount;

    // Cost and profit calculations
    const totalCost = item.quantity * item.unitCost;
    const grossProfit = netAmount - totalCost;
    const netProfit = netReceivable - totalCost;

    // Industry-standard margins (based on revenue/netAmount)
    const grossProfitMargin =
      netAmount > 0 ? (grossProfit / netAmount) * 100 : 0;
    const netProfitMargin = netAmount > 0 ? (netProfit / netAmount) * 100 : 0;
    const markup = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

    return {
      quantity: item.quantity,
      unitPrice: this.roundCurrency(item.unitPrice),
      lineSubtotal: this.roundCurrency(lineSubtotal),
      discountPercent: item.discountPercent || 0,
      discountAmount: this.roundCurrency(discountAmount),
      netAmount: this.roundCurrency(netAmount),
      vatRate: item.vatRate,
      vatAmount: this.roundCurrency(vatAmount),
      whtRate: whtRate,
      whtAmount: this.roundCurrency(whtAmount),
      grossTotal: this.roundCurrency(grossTotal),
      netReceivable: this.roundCurrency(netReceivable),
      unitCost: this.roundCurrency(item.unitCost),
      totalCost: this.roundCurrency(totalCost),
      grossProfit: this.roundCurrency(grossProfit),
      netProfit: this.roundCurrency(netProfit),
      grossProfitMargin: this.roundToTwoDecimals(grossProfitMargin),
      netProfitMargin: this.roundToTwoDecimals(netProfitMargin),
      markup: this.roundToTwoDecimals(markup),
      // Legacy fields
      lineTotal: this.roundCurrency(grossTotal),
      profit: this.roundCurrency(netProfit),
      profitMargin: this.roundToTwoDecimals(netProfitMargin),
      grossMargin: this.roundToTwoDecimals(grossProfitMargin),
      netMargin: this.roundToTwoDecimals(netProfitMargin),
    };
  }

  /**
   * Calculate financials for a single invoice item
   */
  static calculateInvoiceItem(item: {
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    vatRate?: number;
    subjectToWHT?: boolean;
    whtRate?: number;
    unitCost?: number;
  }) {
    const lineSubtotal = item.quantity * item.unitPrice;
    const discountAmount = (lineSubtotal * (item.discountPercent || 0)) / 100;
    const netAmount = lineSubtotal - discountAmount;
    const vatAmount = (netAmount * item.vatRate) / 100;

    // WHT applied to net amount (before VAT)
    const whtAmount =
      item.subjectToWHT && item.whtRate ? (netAmount * item.whtRate) / 100 : 0;
    const grossTotal = netAmount + vatAmount;
    const netReceivable = grossTotal - whtAmount;

    // Profit calculations
    const totalCost = item.quantity * item.unitCost;
    const grossProfit = netAmount - totalCost;
    const netProfit = netReceivable - totalCost;

    // Industry-standard margins
    const grossProfitMargin =
      netAmount > 0 ? (grossProfit / netAmount) * 100 : 0;
    const netProfitMargin = netAmount > 0 ? (netProfit / netAmount) * 100 : 0;
    const markup = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

    return {
      quantity: item.quantity,
      unitPrice: this.roundCurrency(item.unitPrice),
      lineSubtotal: this.roundCurrency(lineSubtotal),
      discountPercent: item.discountPercent || 0,
      discountAmount: this.roundCurrency(discountAmount),
      netAmount: this.roundCurrency(netAmount),
      vatRate: item.vatRate,
      vatAmount: this.roundCurrency(vatAmount),
      subjectToWHT: item.subjectToWHT || false,
      whtRate: item.whtRate || 0,
      whtAmount: this.roundCurrency(whtAmount),
      grossTotal: this.roundCurrency(grossTotal),
      netReceivable: this.roundCurrency(netReceivable),
      unitCost: this.roundCurrency(item.unitCost),
      totalCost: this.roundCurrency(totalCost),
      grossProfit: this.roundCurrency(grossProfit),
      netProfit: this.roundCurrency(netProfit),
      grossProfitMargin: this.roundToTwoDecimals(grossProfitMargin),
      netProfitMargin: this.roundToTwoDecimals(netProfitMargin),
      markup: this.roundToTwoDecimals(markup),
      // Legacy fields
      lineTotal: this.roundCurrency(grossTotal),
      grossMargin: this.roundToTwoDecimals(grossProfitMargin),
      netMargin: this.roundToTwoDecimals(netProfitMargin),
    };
  }

  /**
   * Calculate totals for quotation
   */
  static calculateQuotationTotals(
    items: Array<{
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      vatRate: number;
      unitCost: number;
    }>,
    whtRate: number = 0,
  ) {
    if (!items || items.length === 0) {
      return {
        subtotal: 0,
        totalDiscount: 0,
        netAmount: 0,
        totalVat: 0,
        vatRate: 0, // Effective VAT rate
        totalWht: 0,
        grossTotal: 0,
        netReceivable: 0,
        totalCost: 0,
        totalGrossProfit: 0,
        totalNetProfit: 0,
        grossProfitMargin: 0,
        netProfitMargin: 0,
        totalMarkup: 0,
        whtRate: 0,
        // Legacy fields
        grandTotal: 0,
        expectedGrossProfit: 0,
        expectedNetProfit: 0,
        expectedGrossProfitMargin: 0,
        expectedNetProfitMargin: 0,
        expectedProfit: 0,
        expectedProfitMargin: 0,
        items: [],
      };
    }

    // Validate and process items
    const processedItems = items.map((item, index) => {
      const validatedItem = { ...item };

      if (validatedItem.quantity <= 0) {
        console.warn(
          `[QUOTATION_CALC] Item ${index + 1}: Invalid quantity, using 1`,
        );
        validatedItem.quantity = 1;
      }
      if (validatedItem.unitPrice < 0) {
        console.warn(
          `[QUOTATION_CALC] Item ${index + 1}: Negative price, using 0`,
        );
        validatedItem.unitPrice = 0;
      }
      if (validatedItem.unitCost < 0) {
        console.warn(
          `[QUOTATION_CALC] Item ${index + 1}: Negative cost, using 0`,
        );
        validatedItem.unitCost = 0;
      }
      if (validatedItem.vatRate < 0 || validatedItem.vatRate > 100) {
        console.warn(
          `[QUOTATION_CALC] Item ${index + 1}: Invalid VAT rate, using 0`,
        );
        validatedItem.vatRate = 0;
      }
      if (
        validatedItem.discountPercent &&
        (validatedItem.discountPercent < 0 ||
          validatedItem.discountPercent > 100)
      ) {
        console.warn(
          `[QUOTATION_CALC] Item ${index + 1}: Invalid discount, using 0`,
        );
        validatedItem.discountPercent = 0;
      }

      return this.calculateQuotationItem(validatedItem, whtRate);
    });

    // Aggregate totals
    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.lineSubtotal,
      0,
    );
    const totalDiscount = processedItems.reduce(
      (sum, item) => sum + item.discountAmount,
      0,
    );
    const netAmount = processedItems.reduce(
      (sum, item) => sum + item.netAmount,
      0,
    );
    const totalVat = processedItems.reduce(
      (sum, item) => sum + item.vatAmount,
      0,
    );
    const totalWht = processedItems.reduce(
      (sum, item) => sum + item.whtAmount,
      0,
    );
    const grossTotal = processedItems.reduce(
      (sum, item) => sum + item.grossTotal,
      0,
    );
    const netReceivable = grossTotal - totalWht;
    const totalCost = processedItems.reduce(
      (sum, item) => sum + item.totalCost,
      0,
    );
    const totalGrossProfit = processedItems.reduce(
      (sum, item) => sum + item.grossProfit,
      0,
    );
    const totalNetProfit = processedItems.reduce(
      (sum, item) => sum + item.netProfit,
      0,
    );

    // Calculate margins based on net amount (industry standard)
    const grossProfitMargin =
      netAmount > 0 ? (totalGrossProfit / netAmount) * 100 : 0;
    const netProfitMargin =
      netAmount > 0 ? (totalNetProfit / netAmount) * 100 : 0;
    const totalMarkup =
      totalCost > 0 ? (totalGrossProfit / totalCost) * 100 : 0;

    // Calculate effective VAT rate from totals (for display as single value)
    const effectiveVatRate = netAmount > 0 ? (totalVat / netAmount) * 100 : 0;

    return {
      subtotal: this.roundCurrency(subtotal),
      totalDiscount: this.roundCurrency(totalDiscount),
      netAmount: this.roundCurrency(netAmount),
      totalVat: this.roundCurrency(totalVat),
      vatRate: this.roundToTwoDecimals(effectiveVatRate), // Effective VAT rate for display
      totalWht: this.roundCurrency(totalWht),
      grossTotal: this.roundCurrency(grossTotal),
      netReceivable: this.roundCurrency(netReceivable),
      totalCost: this.roundCurrency(totalCost),
      totalGrossProfit: this.roundCurrency(totalGrossProfit),
      totalNetProfit: this.roundCurrency(totalNetProfit),
      grossProfitMargin: this.roundToTwoDecimals(grossProfitMargin),
      netProfitMargin: this.roundToTwoDecimals(netProfitMargin),
      totalMarkup: this.roundToTwoDecimals(totalMarkup),
      whtRate: whtRate,
      // Legacy fields
      grandTotal: this.roundCurrency(grossTotal),
      expectedGrossProfit: this.roundCurrency(totalGrossProfit),
      expectedNetProfit: this.roundCurrency(totalNetProfit),
      expectedGrossProfitMargin: this.roundToTwoDecimals(grossProfitMargin),
      expectedNetProfitMargin: this.roundToTwoDecimals(netProfitMargin),
      expectedProfit: this.roundCurrency(totalNetProfit),
      expectedProfitMargin: this.roundToTwoDecimals(netProfitMargin),
      items: processedItems,
    };
  }

  /**
   * Calculate totals for invoice
   */
  static calculateInvoiceTotals(
    items: Array<{
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      vatRate?: number;
      subjectToWHT?: boolean;
      whtRate?: number;
      unitCost?: number;
    }>,
  ) {
    if (!items || items.length === 0) {
      return {
        subtotal: 0,
        totalDiscount: 0,
        netAmount: 0,
        totalVat: 0,
        totalWht: 0,
        grossTotal: 0,
        netReceivable: 0,
        totalCost: 0,
        totalGrossProfit: 0,
        totalNetProfit: 0,
        grossProfitMargin: 0,
        netProfitMargin: 0,
        totalMarkup: 0,
        // Legacy
        grandTotal: 0,
        items: [],
      };
    }

    // Validate and process items
    const processedItems = items.map((item, index) => {
      const validatedItem = { ...item };

      if (validatedItem.quantity <= 0) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Invalid quantity, using 1`,
        );
        validatedItem.quantity = 1;
      }
      if (validatedItem.unitPrice < 0) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Negative price, using 0`,
        );
        validatedItem.unitPrice = 0;
      }
      if (validatedItem.unitCost < 0) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Negative cost, using 0`,
        );
        validatedItem.unitCost = 0;
      }
      if (validatedItem.vatRate < 0 || validatedItem.vatRate > 100) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Invalid VAT rate, using 0`,
        );
        validatedItem.vatRate = 0;
      }
      if (
        validatedItem.discountPercent &&
        (validatedItem.discountPercent < 0 ||
          validatedItem.discountPercent > 100)
      ) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Invalid discount, using 0`,
        );
        validatedItem.discountPercent = 0;
      }
      if (
        validatedItem.whtRate &&
        (validatedItem.whtRate < 0 || validatedItem.whtRate > 100)
      ) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Invalid WHT rate, using 0`,
        );
        validatedItem.whtRate = 0;
      }

      return this.calculateInvoiceItem(validatedItem);
    });

    // Aggregate totals
    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.lineSubtotal,
      0,
    );
    const totalDiscount = processedItems.reduce(
      (sum, item) => sum + item.discountAmount,
      0,
    );
    const netAmount = processedItems.reduce(
      (sum, item) => sum + item.netAmount,
      0,
    );
    const totalVat = processedItems.reduce(
      (sum, item) => sum + item.vatAmount,
      0,
    );
    const totalWht = processedItems.reduce(
      (sum, item) => sum + item.whtAmount,
      0,
    );
    const grossTotal = processedItems.reduce(
      (sum, item) => sum + item.grossTotal,
      0,
    );
    const netReceivable = grossTotal - totalWht;
    const totalCost = processedItems.reduce(
      (sum, item) => sum + item.totalCost,
      0,
    );
    const totalGrossProfit = processedItems.reduce(
      (sum, item) => sum + item.grossProfit,
      0,
    );
    const totalNetProfit = processedItems.reduce(
      (sum, item) => sum + item.netProfit,
      0,
    );

    // Calculate margins
    const grossProfitMargin =
      netAmount > 0 ? (totalGrossProfit / netAmount) * 100 : 0;
    const netProfitMargin =
      netAmount > 0 ? (totalNetProfit / netAmount) * 100 : 0;
    const totalMarkup =
      totalCost > 0 ? (totalGrossProfit / totalCost) * 100 : 0;

    return {
      subtotal: this.roundCurrency(subtotal),
      totalDiscount: this.roundCurrency(totalDiscount),
      netAmount: this.roundCurrency(netAmount),
      totalVat: this.roundCurrency(totalVat),
      totalWht: this.roundCurrency(totalWht),
      grossTotal: this.roundCurrency(grossTotal),
      netReceivable: this.roundCurrency(netReceivable),
      totalCost: this.roundCurrency(totalCost),
      totalGrossProfit: this.roundCurrency(totalGrossProfit),
      totalNetProfit: this.roundCurrency(totalNetProfit),
      grossProfitMargin: this.roundToTwoDecimals(grossProfitMargin),
      netProfitMargin: this.roundToTwoDecimals(netProfitMargin),
      totalMarkup: this.roundToTwoDecimals(totalMarkup),
      // Legacy
      grandTotal: this.roundCurrency(grossTotal),
      items: processedItems,
    };
  }

  /**
   * Banker's rounding (round half to even) for currency
   * Industry standard for financial calculations
   */
  static roundCurrency(amount: number): number {
    if (!isFinite(amount)) return 0;

    const multiplied = amount * 100;
    const floor = Math.floor(multiplied);
    const decimal = multiplied - floor;

    // Banker's rounding: if exactly 0.5, round to nearest even
    if (Math.abs(decimal - 0.5) < 0.0001) {
      return (floor % 2 === 0 ? floor : floor + 1) / 100;
    }

    return Math.round(multiplied) / 100;
  }

  /**
   * Standard rounding to 2 decimal places (for percentages)
   */
  static roundToTwoDecimals(amount: number): number {
    if (!isFinite(amount)) return 0;
    return Math.round(amount * 100) / 100;
  }
}

// Base service for Invoice/Quotation Services
@Injectable()
export class BaseFinancialService {
  /**
   * Process quotation financial calculations
   */
  protected processQuotationFinancials(
    items: Array<{
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      vatRate: number;
      unitCost: number;
    }>,
    whtRate: number = 0,
  ) {
    const calculated = FinancialCalculator.calculateQuotationTotals(
      items,
      whtRate,
    );

    console.log(
      `[QUOTATION_SERVICE] Calculated: subtotal=${calculated.subtotal}, totalVat=${calculated.totalVat}, totalWht=${calculated.totalWht}, grossTotal=${calculated.grossTotal}, netReceivable=${calculated.netReceivable}, expectedProfit=${calculated.expectedProfit}, margin=${calculated.expectedProfitMargin}%`,
    );

    return calculated;
  }

  /**
   * Process invoice financial calculations
   */
  protected processInvoiceFinancials(
    items: Array<{
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      vatRate?: number;
      whtRate?: number;
      unitCost?: number;
    }>,
  ) {
    const calculated = FinancialCalculator.calculateInvoiceTotals(items);

    console.log(
      `[INVOICE_SERVICE] Calculated: subtotal=${calculated.subtotal}, totalVat=${calculated.totalVat}, totalWht=${calculated.totalWht}, grossTotal=${calculated.grossTotal}, netReceivable=${calculated.netReceivable}, netProfit=${calculated.totalNetProfit}, netMargin=${calculated.netProfitMargin}%`,
    );

    return calculated;
  }

  /**
   * Generate financial summary for response
   */
  protected generateQuotationSummary(
    calculated: any,
    currency: string = "USD",
  ) {
    return {
      subtotal: {
        amount: calculated.subtotal,
        formatted: this.formatCurrency(calculated.subtotal, currency),
      },
      discount: {
        amount: calculated.totalDiscount,
        formatted: this.formatCurrency(calculated.totalDiscount, currency),
      },
      vat: {
        amount: calculated.totalVat,
        formatted: this.formatCurrency(calculated.totalVat, currency),
        description: "Value Added Tax",
      },
      wht: {
        amount: calculated.totalWht,
        formatted: this.formatCurrency(calculated.totalWht, currency),
        description: "Withholding Tax (deducted from receivable)",
      },
      grossTotal: {
        amount: calculated.grossTotal,
        formatted: this.formatCurrency(calculated.grossTotal, currency),
        description: "Total amount including VAT",
      },
      netReceivable: {
        amount: calculated.netReceivable,
        formatted: this.formatCurrency(calculated.netReceivable, currency),
        description: "Amount received after WHT deduction",
      },
      profit: {
        totalCost: {
          amount: calculated.totalCost,
          formatted: this.formatCurrency(calculated.totalCost, currency),
        },
        expectedProfit: {
          amount: calculated.expectedProfit,
          formatted: this.formatCurrency(calculated.expectedProfit, currency),
          description: "Expected profit if converted to invoice",
        },
        expectedMargin: `${calculated.expectedProfitMargin.toFixed(2)}%`,
      },
      currency,
    };
  }

  protected generateInvoiceSummary(calculated: any, currency: string = "USD") {
    return {
      subtotal: {
        amount: calculated.subtotal,
        formatted: this.formatCurrency(calculated.subtotal, currency),
      },
      discount: {
        amount: calculated.totalDiscount,
        formatted: this.formatCurrency(calculated.totalDiscount, currency),
      },
      vat: {
        amount: calculated.totalVat,
        formatted: this.formatCurrency(calculated.totalVat, currency),
        description: "Value Added Tax (customer pays)",
      },
      withholdingTax: {
        amount: calculated.totalWht,
        formatted: this.formatCurrency(calculated.totalWht, currency),
        description: "Withholding Tax (deducted from our receivable)",
      },
      grossTotal: {
        amount: calculated.grossTotal,
        formatted: this.formatCurrency(calculated.grossTotal, currency),
        description: "Total amount including VAT",
      },
      netReceivable: {
        amount: calculated.netReceivable,
        formatted: this.formatCurrency(calculated.netReceivable, currency),
        description: "Amount we actually receive (after WHT deduction)",
      },
      profit: {
        totalCost: {
          amount: calculated.totalCost,
          formatted: this.formatCurrency(calculated.totalCost, currency),
        },
        grossProfit: {
          amount: calculated.totalGrossProfit,
          formatted: this.formatCurrency(calculated.totalGrossProfit, currency),
          description: "Profit before withholding tax",
        },
        netProfit: {
          amount: calculated.totalNetProfit,
          formatted: this.formatCurrency(calculated.totalNetProfit, currency),
          description: "Actual profit after withholding tax deduction",
        },
        grossMargin: `${calculated.grossProfitMargin.toFixed(2)}%`,
        netMargin: `${calculated.netProfitMargin.toFixed(2)}%`,
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

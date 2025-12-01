import { Injectable } from "@nestjs/common";

// Financial calculation utility class
export class FinancialCalculator {
  /**
   * Calculate financials for a single quotation item
   */
  static calculateQuotationItem(item: {
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    vatRate: number;
    unitCost: number;
  }) {
    const lineSubtotal = item.quantity * item.unitPrice;
    const discountAmount = (lineSubtotal * (item.discountPercent || 0)) / 100;
    const afterDiscount = lineSubtotal - discountAmount;
    const vatAmount = (afterDiscount * item.vatRate) / 100;
    const lineTotal = afterDiscount + vatAmount;

    // Profit calculations
    const totalCost = item.quantity * item.unitCost;
    const profit = afterDiscount - totalCost;
    const profitMargin = afterDiscount > 0 ? (profit / afterDiscount) * 100 : 0;

    return {
      quantity: item.quantity,
      unitPrice: this.roundToTwoDecimals(item.unitPrice),
      lineSubtotal: this.roundToTwoDecimals(lineSubtotal),
      discountPercent: item.discountPercent || 0,
      discountAmount: this.roundToTwoDecimals(discountAmount),
      vatRate: item.vatRate,
      vatAmount: this.roundToTwoDecimals(vatAmount),
      lineTotal: this.roundToTwoDecimals(lineTotal),
      unitCost: this.roundToTwoDecimals(item.unitCost),
      totalCost: this.roundToTwoDecimals(totalCost),
      profit: this.roundToTwoDecimals(profit),
      profitMargin: this.roundToTwoDecimals(profitMargin),
    };
  }

  /**
   * Calculate financials for a single invoice item
   */
  static calculateInvoiceItem(item: {
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    vatRate: number;
    subjectToWHT?: boolean;
    whtRate?: number;
    unitCost: number;
  }) {
    const lineSubtotal = item.quantity * item.unitPrice;
    const discountAmount = (lineSubtotal * (item.discountPercent || 0)) / 100;
    const afterDiscount = lineSubtotal - discountAmount;
    const vatAmount = (afterDiscount * item.vatRate) / 100;
    const whtAmount =
      item.subjectToWHT && item.whtRate
        ? (afterDiscount * item.whtRate) / 100
        : 0;
    const lineTotal = afterDiscount + vatAmount;

    // Profit calculations
    const totalCost = item.quantity * item.unitCost;
    const grossProfit = afterDiscount - totalCost;
    const netProfit = afterDiscount - whtAmount - totalCost;
    const grossMargin =
      afterDiscount > 0 ? (grossProfit / afterDiscount) * 100 : 0;
    const netMargin =
      afterDiscount - whtAmount > 0
        ? (netProfit / (afterDiscount - whtAmount)) * 100
        : 0;

    return {
      quantity: item.quantity,
      unitPrice: this.roundToTwoDecimals(item.unitPrice),
      lineSubtotal: this.roundToTwoDecimals(lineSubtotal),
      discountPercent: item.discountPercent || 0,
      discountAmount: this.roundToTwoDecimals(discountAmount),
      vatRate: item.vatRate,
      vatAmount: this.roundToTwoDecimals(vatAmount),
      subjectToWHT: item.subjectToWHT || false,
      whtRate: item.whtRate || 0,
      whtAmount: this.roundToTwoDecimals(whtAmount),
      lineTotal: this.roundToTwoDecimals(lineTotal),
      unitCost: this.roundToTwoDecimals(item.unitCost),
      totalCost: this.roundToTwoDecimals(totalCost),
      grossProfit: this.roundToTwoDecimals(grossProfit),
      netProfit: this.roundToTwoDecimals(netProfit),
      grossMargin: this.roundToTwoDecimals(grossMargin),
      netMargin: this.roundToTwoDecimals(netMargin),
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
    }>
  ) {
    if (!items || items.length === 0) {
      return {
        subtotal: 0,
        totalDiscount: 0,
        totalVat: 0,
        grandTotal: 0,
        totalCost: 0,
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
          `[QUOTATION_CALC] Item ${index + 1}: Invalid quantity, using 1`
        );
        validatedItem.quantity = 1;
      }
      if (validatedItem.unitPrice < 0) {
        console.warn(
          `[QUOTATION_CALC] Item ${index + 1}: Negative price, using 0`
        );
        validatedItem.unitPrice = 0;
      }
      if (validatedItem.unitCost < 0) {
        console.warn(
          `[QUOTATION_CALC] Item ${index + 1}: Negative cost, using 0`
        );
        validatedItem.unitCost = 0;
      }
      if (validatedItem.vatRate < 0 || validatedItem.vatRate > 100) {
        console.warn(
          `[QUOTATION_CALC] Item ${index + 1}: Invalid VAT rate, using 0`
        );
        validatedItem.vatRate = 0;
      }
      if (
        validatedItem.discountPercent &&
        (validatedItem.discountPercent < 0 ||
          validatedItem.discountPercent > 100)
      ) {
        console.warn(
          `[QUOTATION_CALC] Item ${index + 1}: Invalid discount, using 0`
        );
        validatedItem.discountPercent = 0;
      }

      return this.calculateQuotationItem(validatedItem);
    });

    // Sum up totals
    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.lineSubtotal,
      0
    );
    const totalDiscount = processedItems.reduce(
      (sum, item) => sum + item.discountAmount,
      0
    );
    const totalVat = processedItems.reduce(
      (sum, item) => sum + item.vatAmount,
      0
    );
    const grandTotal = processedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
    const totalCost = processedItems.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );
    const expectedProfit = processedItems.reduce(
      (sum, item) => sum + item.profit,
      0
    );

    const afterDiscountTotal = subtotal - totalDiscount;
    const expectedProfitMargin =
      afterDiscountTotal > 0 ? (expectedProfit / afterDiscountTotal) * 100 : 0;

    return {
      subtotal: this.roundToTwoDecimals(subtotal),
      totalDiscount: this.roundToTwoDecimals(totalDiscount),
      totalVat: this.roundToTwoDecimals(totalVat),
      grandTotal: this.roundToTwoDecimals(grandTotal),
      totalCost: this.roundToTwoDecimals(totalCost),
      expectedProfit: this.roundToTwoDecimals(expectedProfit),
      expectedProfitMargin: this.roundToTwoDecimals(expectedProfitMargin),
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
      vatRate: number;
      subjectToWHT?: boolean;
      whtRate?: number;
      unitCost: number;
    }>
  ) {
    if (!items || items.length === 0) {
      return {
        subtotal: 0,
        totalDiscount: 0,
        totalVat: 0,
        totalWht: 0,
        grandTotal: 0,
        netReceivable: 0,
        totalCost: 0,
        totalGrossProfit: 0,
        totalNetProfit: 0,
        grossProfitMargin: 0,
        netProfitMargin: 0,
        items: [],
      };
    }

    // Validate and process items
    const processedItems = items.map((item, index) => {
      const validatedItem = { ...item };

      if (validatedItem.quantity <= 0) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Invalid quantity, using 1`
        );
        validatedItem.quantity = 1;
      }
      if (validatedItem.unitPrice < 0) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Negative price, using 0`
        );
        validatedItem.unitPrice = 0;
      }
      if (validatedItem.unitCost < 0) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Negative cost, using 0`
        );
        validatedItem.unitCost = 0;
      }
      if (validatedItem.vatRate < 0 || validatedItem.vatRate > 100) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Invalid VAT rate, using 0`
        );
        validatedItem.vatRate = 0;
      }
      if (
        validatedItem.whtRate &&
        (validatedItem.whtRate < 0 || validatedItem.whtRate > 100)
      ) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Invalid WHT rate, using 0`
        );
        validatedItem.whtRate = 0;
      }
      if (
        validatedItem.discountPercent &&
        (validatedItem.discountPercent < 0 ||
          validatedItem.discountPercent > 100)
      ) {
        console.warn(
          `[INVOICE_CALC] Item ${index + 1}: Invalid discount, using 0`
        );
        validatedItem.discountPercent = 0;
      }

      return this.calculateInvoiceItem(validatedItem);
    });

    // Sum up totals
    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.lineSubtotal,
      0
    );
    const totalDiscount = processedItems.reduce(
      (sum, item) => sum + item.discountAmount,
      0
    );
    const totalVat = processedItems.reduce(
      (sum, item) => sum + item.vatAmount,
      0
    );
    const totalWht = processedItems.reduce(
      (sum, item) => sum + item.whtAmount,
      0
    );
    const grandTotal = processedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
    const netReceivable = grandTotal - totalWht;
    const totalCost = processedItems.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );
    const totalGrossProfit = processedItems.reduce(
      (sum, item) => sum + item.grossProfit,
      0
    );
    const totalNetProfit = processedItems.reduce(
      (sum, item) => sum + item.netProfit,
      0
    );

    const afterDiscountTotal = subtotal - totalDiscount;
    const grossProfitMargin =
      afterDiscountTotal > 0
        ? (totalGrossProfit / afterDiscountTotal) * 100
        : 0;
    const netProfitMargin =
      netReceivable > 0 ? (totalNetProfit / netReceivable) * 100 : 0;

    return {
      subtotal: this.roundToTwoDecimals(subtotal),
      totalDiscount: this.roundToTwoDecimals(totalDiscount),
      totalVat: this.roundToTwoDecimals(totalVat),
      totalWht: this.roundToTwoDecimals(totalWht),
      grandTotal: this.roundToTwoDecimals(grandTotal),
      netReceivable: this.roundToTwoDecimals(netReceivable),
      totalCost: this.roundToTwoDecimals(totalCost),
      totalGrossProfit: this.roundToTwoDecimals(totalGrossProfit),
      totalNetProfit: this.roundToTwoDecimals(totalNetProfit),
      grossProfitMargin: this.roundToTwoDecimals(grossProfitMargin),
      netProfitMargin: this.roundToTwoDecimals(netProfitMargin),
      items: processedItems,
    };
  }

  /**
   * Round to 2 decimal places for currency
   */
  static roundToTwoDecimals(amount: number): number {
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
    }>
  ) {
    const calculated = FinancialCalculator.calculateQuotationTotals(items);

    console.log(
      `[QUOTATION_SERVICE] Calculated: subtotal=${calculated.subtotal}, totalVat=${calculated.totalVat}, grandTotal=${calculated.grandTotal}, expectedProfit=${calculated.expectedProfit}, margin=${calculated.expectedProfitMargin}%`
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
      vatRate: number;
      subjectToWHT?: boolean;
      whtRate?: number;
      unitCost: number;
    }>
  ) {
    const calculated = FinancialCalculator.calculateInvoiceTotals(items);

    console.log(
      `[INVOICE_SERVICE] Calculated: subtotal=${calculated.subtotal}, totalVat=${calculated.totalVat}, totalWht=${calculated.totalWht}, grandTotal=${calculated.grandTotal}, netReceivable=${calculated.netReceivable}, netProfit=${calculated.totalNetProfit}, netMargin=${calculated.netProfitMargin}%`
    );

    return calculated;
  }

  /**
   * Generate financial summary for response
   */
  protected generateQuotationSummary(
    calculated: any,
    currency: string = "USD"
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
      grandTotal: {
        amount: calculated.grandTotal,
        formatted: this.formatCurrency(calculated.grandTotal, currency),
        description: "Total amount customer pays",
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
      grandTotal: {
        amount: calculated.grandTotal,
        formatted: this.formatCurrency(calculated.grandTotal, currency),
        description: "Total amount customer pays",
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

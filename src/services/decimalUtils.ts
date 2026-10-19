/**
 * DecimalUtils
 * 
 * Production financial calculation service for NA Distributors ERP.
 * Implements a rounding-safe pattern using integer cents (multiplying by 100 before rounding)
 * to avoid IEEE-754 floating point arithmetic anomalies and premature string truncation from toFixed(2).
 */

export const DecimalUtils = {
  /**
   * Convert an LKR decimal amount to integer cents (safe against floating point imprecision).
   * e.g., 128.84 -> 12884 cents
   */
  toCents(amount: number): number {
    if (!amount || isNaN(amount)) return 0;
    return Math.round((Number(amount) + Number.EPSILON) * 100);
  },

  /**
   * Convert integer cents back to standard decimal LKR.
   * e.g., 12884 cents -> 128.84
   */
  fromCents(cents: number): number {
    if (!cents || isNaN(cents)) return 0;
    return Math.round(cents) / 100;
  },

  /**
   * Safely round an amount to 2 decimal places (cents) without using toFixed(2) for math.
   */
  round(amount: number): number {
    if (!amount || isNaN(amount)) return 0;
    return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  },

  /**
   * Safe financial addition of two amounts using integer cents.
   */
  add(a: number, b: number): number {
    const centsA = DecimalUtils.toCents(a);
    const centsB = DecimalUtils.toCents(b);
    return (centsA + centsB) / 100;
  },

  /**
   * Safe financial subtraction of two amounts using integer cents.
   */
  subtract(a: number, b: number): number {
    const centsA = DecimalUtils.toCents(a);
    const centsB = DecimalUtils.toCents(b);
    return (centsA - centsB) / 100;
  },

  /**
   * Safe financial multiplication (e.g. quantity * unit price).
   * Evaluates in full precision and rounds result to exact cents.
   */
  multiply(quantity: number, price: number): number {
    const q = Number(quantity) || 0;
    const p = Number(price) || 0;
    return Math.round((q * p + Number.EPSILON) * 100) / 100;
  },

  /**
   * Safe financial division (e.g. total / quantity).
   * Rounds result to exact cents.
   */
  divide(amount: number, divisor: number): number {
    const a = Number(amount) || 0;
    const d = Number(divisor) || 0;
    if (d === 0) return 0;
    return Math.round(((a / d) + Number.EPSILON) * 100) / 100;
  },

  /**
   * Safe percentage calculation: (amount * rate) / 100 rounded safely to cents.
   */
  percent(amount: number, percentageRate: number): number {
    const a = Number(amount) || 0;
    const r = Number(percentageRate) || 0;
    if (a === 0 || r === 0) return 0;
    return Math.round(((a * r) / 100 + Number.EPSILON) * 100) / 100;
  },

  /**
   * Safe sum of multiple decimal amounts.
   */
  sum(amounts: number[]): number {
    if (!amounts || amounts.length === 0) return 0;
    const totalCents = amounts.reduce((acc, val) => acc + DecimalUtils.toCents(val || 0), 0);
    return totalCents / 100;
  },

  /**
   * Safe margin and profit calculation from selling price and cost price.
   */
  calculateMargin(sellingPrice: number, costPrice: number): { profit: number; marginPct: number } {
    const sell = Number(sellingPrice) || 0;
    const cost = Number(costPrice) || 0;
    const profit = DecimalUtils.subtract(sell, cost);
    const marginPct = sell > 0 ? Math.round(((profit / sell) * 100 + Number.EPSILON) * 100) / 100 : 0;
    return { profit, marginPct };
  },

  /**
   * Safe lot valuation calculation.
   * If a product has a master batch purchase cost (batchCost) and initialStock:
   * - When all packets are in stock (currentStock === initialStock), LOT value is EXACTLY batchCost
   *   (e.g., Rs. 32,208.75 for 250 packets, completely avoiding the Rs. 32,210.00 rounding error).
   * - When stock is depleted or adjusted, calculates proportional lot valuation using exact cents.
   * - If batchCost is not provided, uses safe multiplication of currentStock * costPrice.
   */
  calculateLotValue(
    currentStock: number,
    initialStock?: number,
    batchCost?: number,
    costPrice?: number
  ): number {
    const stock = Math.max(0, Number(currentStock) || 0);
    const initStock = Number(initialStock) || 0;
    const batch = Number(batchCost) || 0;
    const unitCost = Number(costPrice) || 0;

    if (stock === 0) return 0;

    // If unit cost is provided and batch cost exists, check if batch matches unit cost
    if (batch > 0 && initStock > 0) {
      const derivedUnit = batch / initStock;
      // If user edited costPrice and it diverged from batch/initStock (by more than 1 cent),
      // honor the user's updated costPrice!
      if (unitCost > 0 && Math.abs(derivedUnit - unitCost) > 0.02) {
        return DecimalUtils.multiply(stock, unitCost);
      }

      if (stock === initStock) {
        // Return exact manufacturer invoice batch cost without any rounding error
        return DecimalUtils.round(batch);
      }
      // Proportional lot value for remaining stock
      return Math.round(((stock * batch) / initStock + Number.EPSILON) * 100) / 100;
    }

    return DecimalUtils.multiply(stock, unitCost);
  },

  /**
   * Complete safe calculation for order lines, discounts, produce taxes, and totals.
   */
  calculateOrder(
    items: Array<{ quantity: number; unitPrice: number; costPrice?: number }>,
    discountPercentage: number = 0,
    taxRate: number = 0
  ): {
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    taxAmount: number;
    totalAmount: number;
    totalCost: number;
    grossProfit: number;
  } {
    const lineTotals = items.map((i) => DecimalUtils.multiply(i.quantity, i.unitPrice));
    const subtotal = DecimalUtils.sum(lineTotals);

    const discountAmount = DecimalUtils.percent(subtotal, discountPercentage);
    const taxableAmount = Math.max(0, DecimalUtils.subtract(subtotal, discountAmount));
    const taxAmount = DecimalUtils.percent(taxableAmount, taxRate);
    const totalAmount = DecimalUtils.add(taxableAmount, taxAmount);

    const costLines = items.map((i) => DecimalUtils.multiply(i.quantity, i.costPrice || 0));
    const totalCost = DecimalUtils.sum(costLines);
    const grossProfit = DecimalUtils.subtract(totalAmount, totalCost);

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      totalAmount,
      totalCost,
      grossProfit,
    };
  },

  /**
   * Format numbers to Sri Lankan Rupee currency string with thousands separators and exact cents.
   * e.g. 32208.75 -> "Rs. 32,208.75"
   */
  formatLKR(amount: number, showPrefix: boolean = true): string {
    const safeAmount = DecimalUtils.round(amount);
    const formatted = safeAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return showPrefix ? `Rs. ${formatted}` : formatted;
  },
};

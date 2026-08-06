export const BASE_CURRENCY = "PKR";

export const CURRENCIES = [
  { code: "PKR", label: "PKR — Pakistani Rupee", symbol: "Rs" },
  { code: "AED", label: "AED — UAE Dirham", symbol: "د.إ" },
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
  { code: "GBP", label: "GBP — British Pound", symbol: "£" },
  { code: "EUR", label: "EUR — Euro", symbol: "€" },
  { code: "SAR", label: "SAR — Saudi Riyal", symbol: "﷼" },
  { code: "CAD", label: "CAD — Canadian Dollar", symbol: "C$" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return CURRENCIES.some((c) => c.code === code);
}

/** Convert foreign amount to PKR using same-day rate (PKR per 1 unit). */
export function toPkr(originalAmount: number, currency: string, exchangeRate: number) {
  if (!Number.isFinite(originalAmount) || originalAmount < 0) {
    throw new Error("Invalid amount");
  }
  const rate = currency === BASE_CURRENCY ? 1 : exchangeRate;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Enter a valid exchange rate (PKR per 1 unit)");
  }
  return Math.round(originalAmount * rate * 100) / 100;
}

export function formatFxLine(input: {
  originalAmount: number;
  currency: string;
  exchangeRate: number;
  amountPkr: number;
}) {
  if (!input.currency || input.currency === BASE_CURRENCY) {
    return null;
  }
  return `${input.currency} ${input.originalAmount.toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })} @ ${input.exchangeRate.toLocaleString("en-PK", {
    maximumFractionDigits: 4,
  })} = PKR ${input.amountPkr.toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
}

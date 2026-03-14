export type CurrencyCode = "NIO" | "USD";

export type AmountValidationResult = {
  normalized: string;
  numericValue: number;
  maxDigits: number;
  isFormatValid: boolean;
  isDigitsValid: boolean;
  isPositive: boolean;
  isValid: boolean;
};

export const getMaxIntegerDigitsByCurrency = (currency: CurrencyCode) =>
  currency === "USD" ? 3 : 4;

export const normalizeDecimalInput = (rawValue: string) =>
  String(rawValue ?? "").trim().replace(",", ".");

export const isDecimalWithTwoPlaces = (value: string) =>
  /^\d*\.?\d{0,2}$/.test(value);

export const validateAmountByCurrency = (
  rawValue: string,
  currency: CurrencyCode
): AmountValidationResult => {
  const normalized = normalizeDecimalInput(rawValue);
  const [intPart = ""] = normalized.split(".");
  const numericValue = Number(normalized || 0);
  const maxDigits = getMaxIntegerDigitsByCurrency(currency);
  const isFormatValid = isDecimalWithTwoPlaces(normalized);
  const isDigitsValid = intPart.length <= maxDigits;
  const isPositive = numericValue > 0;
  const isValid =
    normalized.length > 0 && isFormatValid && isDigitsValid && isPositive;

  return {
    normalized,
    numericValue,
    maxDigits,
    isFormatValid,
    isDigitsValid,
    isPositive,
    isValid,
  };
};

export const canApplyInputChange = (rawValue: string, currency: CurrencyCode) => {
  const normalized = normalizeDecimalInput(rawValue);
  const [intPart = ""] = normalized.split(".");
  const maxDigits = getMaxIntegerDigitsByCurrency(currency);
  return isDecimalWithTwoPlaces(normalized) && intPart.length <= maxDigits;
};

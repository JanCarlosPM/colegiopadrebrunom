export const DEFAULT_EXCHANGE_RATE = 36.67;

export const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export type CurrencyCode = "NIO" | "USD";

export const normalizeCurrency = (currency?: string): CurrencyCode =>
  currency === "USD" ? "USD" : "NIO";

export const toFixed2 = (value: number) => Number(value.toFixed(2));

export const convertCurrency = (
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  exchangeRate = DEFAULT_EXCHANGE_RATE
) => {
  if (fromCurrency === toCurrency) return amount;
  if (fromCurrency === "USD" && toCurrency === "NIO") return amount * exchangeRate;
  return amount / exchangeRate;
};

export const currencySymbol = (currency?: string) =>
  normalizeCurrency(currency) === "USD" ? "$" : "C$";

export const formatMoney = (amount: number, currency?: string) =>
  `${currencySymbol(currency)} ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const getStatusVariant = (status?: string) => {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "PAGADO" || normalized === "SOLVENTE") return "success";
  if (normalized === "PARCIAL" || normalized === "PENDIENTE") return "warning";
  if (normalized === "MOROSO" || normalized === "INACTIVO") return "destructive";
  return "neutral";
};

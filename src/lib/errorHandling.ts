import type { CurrencyCode } from "@/lib/paymentValidation";

type ErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type ErrorMapOptions = {
  currency?: CurrencyCode;
  fallback: string;
  customMap?: Record<string, string>;
};

export const isMissingTableError = (error: unknown) => {
  const err = (error ?? {}) as ErrorLike;
  const msg = String(err.message || "").toLowerCase();
  const details = String(err.details || "").toLowerCase();
  return (
    err.code === "PGRST205" ||
    msg.includes("schema cache") ||
    msg.includes("payment_items") ||
    msg.includes("other_payments") ||
    details.includes("payment_items") ||
    details.includes("other_payments")
  );
};

export const mapSupabaseErrorToToast = (
  error: unknown,
  options: ErrorMapOptions
) => {
  const err = (error ?? {}) as ErrorLike;
  const code = String(err.message ?? "");
  const customMap = options.customMap ?? {};

  if (customMap[code]) return customMap[code];

  if (code === "LIMITE_RECIBIDO") {
    return options.currency === "USD"
      ? "En USD, el campo Recibido acepta máximo 3 cifras (hasta 999.99)."
      : "En C$, el campo Recibido acepta máximo 4 cifras (hasta 9999.99).";
  }

  return err.message || err.details || err.hint || options.fallback;
};

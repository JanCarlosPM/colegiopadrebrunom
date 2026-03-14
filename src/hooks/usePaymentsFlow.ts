import { useMemo } from "react";
import { normalizeCurrency } from "@/lib/billing";
import { validateAmountByCurrency } from "@/lib/paymentValidation";

type UsePaymentsFlowArgs = {
  chargeAmount: number;
  chargePaidAmount: number;
  chargeCurrency?: string;
  payCurrency?: string;
  exchangeRate: number;
  receivedInput: string;
};

export function usePaymentsFlow({
  chargeAmount,
  chargePaidAmount,
  chargeCurrency,
  payCurrency,
  exchangeRate,
  receivedInput,
}: UsePaymentsFlowArgs) {
  return useMemo(() => {
    const remainingInChargeCurrency = Math.max(chargeAmount - chargePaidAmount, 0);
    const normalizedChargeCurrency = normalizeCurrency(chargeCurrency ?? "USD");
    const normalizedPayCurrency = normalizeCurrency(payCurrency ?? "USD");
    const validation = validateAmountByCurrency(
      receivedInput,
      normalizedPayCurrency
    );

    const remainingInPayCurrency =
      normalizedChargeCurrency === normalizedPayCurrency
        ? remainingInChargeCurrency
        : normalizedChargeCurrency === "USD" && normalizedPayCurrency === "NIO"
          ? remainingInChargeCurrency * exchangeRate
          : remainingInChargeCurrency / exchangeRate;

    const appliedInPayCurrency = Math.min(
      validation.numericValue,
      Number(remainingInPayCurrency.toFixed(2))
    );

    const appliedInChargeCurrency =
      normalizedChargeCurrency === normalizedPayCurrency
        ? appliedInPayCurrency
        : normalizedChargeCurrency === "USD" && normalizedPayCurrency === "NIO"
          ? appliedInPayCurrency / exchangeRate
          : appliedInPayCurrency * exchangeRate;

    const change = Math.max(validation.numericValue - appliedInPayCurrency, 0);

    return {
      validation,
      normalizedChargeCurrency,
      normalizedPayCurrency,
      remainingInChargeCurrency,
      remainingInPayCurrency,
      appliedInPayCurrency,
      appliedInChargeCurrency,
      change,
    };
  }, [
    chargeAmount,
    chargePaidAmount,
    chargeCurrency,
    payCurrency,
    exchangeRate,
    receivedInput,
  ]);
}

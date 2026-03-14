import { useMemo } from "react";
import { validateAmountByCurrency } from "@/lib/paymentValidation";

type UseEnrollmentFlowArgs = {
  currency: "NIO" | "USD";
  saldoPendiente: number;
  recibidoInput: string;
};

export function useEnrollmentFlow({
  currency,
  saldoPendiente,
  recibidoInput,
}: UseEnrollmentFlowArgs) {
  return useMemo(() => {
    const validation = validateAmountByCurrency(recibidoInput, currency);
    const paid = validation.numericValue;
    const cambio = Math.max(paid - saldoPendiente, 0);
    const montoAplicable = Math.min(paid, saldoPendiente);
    const status =
      montoAplicable + 0.0001 >= saldoPendiente ? "PAGADO" : "PARCIAL";

    return {
      validation,
      paid,
      cambio,
      montoAplicable,
      status,
    };
  }, [currency, saldoPendiente, recibidoInput]);
}

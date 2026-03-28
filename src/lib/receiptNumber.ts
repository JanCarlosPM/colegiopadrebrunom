import { supabase } from "@/lib/supabase";

function maxNumericFromReceiptValues(values: (string | null | undefined)[]): number {
  let max = 0;
  for (const v of values) {
    if (!v || typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    const parts = trimmed.match(/\d+/g);
    if (!parts) continue;
    for (const p of parts) {
      const n = parseInt(p, 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  return max;
}

/** Número mostrado en el PDF: `receipt_number` si existe; si no, últimos caracteres del id. */
export function receiptNumberForPrint(
  receiptNumber: string | null | undefined,
  paymentId: string,
): string {
  const t = String(receiptNumber ?? "").trim();
  if (t.length > 0) return t;
  return String(paymentId).slice(-5);
}

/** Siguiente correlativo sugerido (max numérico hallado en recibos del año + 1). */
export async function suggestNextReceiptNumber(academicYear: number): Promise<string> {
  const [payRes, otherRes] = await Promise.all([
    supabase
      .from("payments")
      .select("receipt_number")
      .eq("academic_year", academicYear)
      .not("receipt_number", "is", null),
    supabase
      .from("other_payments")
      .select("receipt_number")
      .eq("academic_year", academicYear)
      .not("receipt_number", "is", null),
  ]);

  const combined: string[] = [];
  if (!payRes.error && payRes.data) {
    for (const r of payRes.data as { receipt_number?: string | null }[]) {
      if (r.receipt_number) combined.push(r.receipt_number);
    }
  }
  if (!otherRes.error && otherRes.data) {
    for (const r of otherRes.data as { receipt_number?: string | null }[]) {
      if (r.receipt_number) combined.push(r.receipt_number);
    }
  }

  return String(maxNumericFromReceiptValues(combined) + 1);
}

import { describe, expect, it } from "vitest";
import {
  isMissingTableError,
  mapSupabaseErrorToToast,
} from "@/lib/errorHandling";

describe("errorHandling", () => {
  it("detecta error de tabla faltante por codigo", () => {
    expect(isMissingTableError({ code: "PGRST205" })).toBe(true);
  });

  it("detecta error de tabla faltante por mensaje", () => {
    expect(
      isMissingTableError({ message: "Could not find payment_items in schema cache" })
    ).toBe(true);
  });

  it("mapea limite recibido por moneda USD", () => {
    const result = mapSupabaseErrorToToast(
      { message: "LIMITE_RECIBIDO" },
      { currency: "USD", fallback: "Error genérico" }
    );
    expect(result).toContain("USD");
  });

  it("retorna fallback si no hay detalle", () => {
    const result = mapSupabaseErrorToToast({}, { fallback: "Error base" });
    expect(result).toBe("Error base");
  });
});

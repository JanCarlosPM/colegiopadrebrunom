import { describe, expect, it } from "vitest";
import {
  canApplyInputChange,
  normalizeDecimalInput,
  validateAmountByCurrency,
} from "@/lib/paymentValidation";

describe("paymentValidation", () => {
  it("normaliza coma decimal", () => {
    expect(normalizeDecimalInput("12,5")).toBe("12.5");
  });

  it("valida monto USD correcto", () => {
    const result = validateAmountByCurrency("999.99", "USD");
    expect(result.isValid).toBe(true);
    expect(result.numericValue).toBe(999.99);
  });

  it("rechaza USD con mas de 3 cifras enteras", () => {
    const result = validateAmountByCurrency("1000.00", "USD");
    expect(result.isDigitsValid).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it("valida monto NIO correcto con 4 cifras", () => {
    const result = validateAmountByCurrency("9999.99", "NIO");
    expect(result.isValid).toBe(true);
  });

  it("rechaza mas de 2 decimales", () => {
    const result = validateAmountByCurrency("10.999", "NIO");
    expect(result.isFormatValid).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it("canApplyInputChange respeta limites por moneda", () => {
    expect(canApplyInputChange("999.99", "USD")).toBe(true);
    expect(canApplyInputChange("1000.00", "USD")).toBe(false);
    expect(canApplyInputChange("9999.99", "NIO")).toBe(true);
    expect(canApplyInputChange("10000.00", "NIO")).toBe(false);
  });
});

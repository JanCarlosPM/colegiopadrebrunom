import { describe, expect, it } from "vitest";
import { convertCurrency, getStatusVariant } from "@/lib/billing";

describe("billing", () => {
  it("convierte USD a NIO", () => {
    expect(convertCurrency(10, "USD", "NIO", 36.5)).toBe(365);
  });

  it("convierte NIO a USD", () => {
    expect(convertCurrency(730, "NIO", "USD", 36.5)).toBe(20);
  });

  it("mantiene monto al convertir misma moneda", () => {
    expect(convertCurrency(100, "USD", "USD", 36.5)).toBe(100);
  });

  it("clasifica estado parcial como warning", () => {
    expect(getStatusVariant("PARCIAL")).toBe("warning");
  });
});

import { describe, expect, it } from "vitest";
import { buildMissingMonthlyCharges } from "@/services/charges";

describe("buildMissingMonthlyCharges", () => {
  it("crea 12 cargos cuando no existen meses", () => {
    const rows = buildMissingMonthlyCharges({
      studentId: "st-1",
      gradeId: "gr-1",
      academicYear: 2026,
      monthlyAmount: 770,
      currency: "NIO",
      existingMonths: [],
    });
    expect(rows).toHaveLength(12);
    expect(rows[0].month).toBe(1);
    expect(rows[11].month).toBe(12);
  });

  it("solo crea meses faltantes", () => {
    const rows = buildMissingMonthlyCharges({
      studentId: "st-1",
      gradeId: "gr-1",
      academicYear: 2026,
      monthlyAmount: 21,
      currency: "USD",
      existingMonths: [1, 2, 3, 10],
    });
    expect(rows).toHaveLength(8);
    expect(rows.some((row) => row.month === 1)).toBe(false);
    expect(rows.some((row) => row.month === 4)).toBe(true);
  });

  it("ignora meses invalidos en existentes", () => {
    const rows = buildMissingMonthlyCharges({
      studentId: "st-1",
      gradeId: "gr-1",
      academicYear: 2026,
      monthlyAmount: 770,
      currency: "NIO",
      existingMonths: [0, 13, -1, 1],
    });
    expect(rows).toHaveLength(11);
    expect(rows.some((row) => row.month === 1)).toBe(false);
  });
});

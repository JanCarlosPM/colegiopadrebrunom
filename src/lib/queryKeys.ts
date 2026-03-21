import type { QueryClient } from "@tanstack/react-query";

/**
 * Claves centralizadas de TanStack Query para coherencia e invalidación.
 * Prefijo por dominio facilita invalidaciones amplias con partial key.
 */
export const queryKeys = {
  dashboard: (year?: number, month?: number) =>
    year != null && month != null
      ? (["dashboard", year, month] as const)
      : (["dashboard"] as const),

  students: ["students"] as const,
  studentsActive: ["students-active"] as const,

  matriculas: (year: number) => ["matriculas", year] as const,

  payments: (year: number) => ["payments", year] as const,
  recentPayments: ["recent-payments"] as const,

  reportesData: ["reportes-data"] as const,

  configSettings: ["config-settings"] as const,
  academicYear: ["academic-year"] as const,
  gradePrices: ["grade-prices"] as const,
  enrollmentPricing: ["enrollment-pricing"] as const,
  appUsers: ["app-users"] as const,

  paymentItems: ["payment-items"] as const,
  otherPayments: (year: number) => ["other-payments", year] as const,

  grades: ["grades"] as const,
  sections: ["sections"] as const,
} as const;

/** Invalida vistas que dependen de pagos, matrículas o cargos. */
export async function invalidateFinancialViews(
  qc: QueryClient,
  opts?: { year?: number }
) {
  const tasks: Promise<unknown>[] = [
    qc.invalidateQueries({ queryKey: ["dashboard"] }),
    qc.invalidateQueries({ queryKey: queryKeys.recentPayments }),
    qc.invalidateQueries({ queryKey: queryKeys.reportesData }),
    qc.invalidateQueries({ queryKey: queryKeys.students }),
    qc.invalidateQueries({ queryKey: queryKeys.studentsActive }),
  ];
  if (opts?.year != null) {
    tasks.push(
      qc.invalidateQueries({ queryKey: queryKeys.payments(opts.year) }),
      qc.invalidateQueries({ queryKey: queryKeys.matriculas(opts.year) })
    );
  }
  await Promise.all(tasks);
}

export type BuildMissingMonthlyChargesInput = {
  studentId: string;
  gradeId: string;
  academicYear: number;
  monthlyAmount: number;
  currency: "NIO" | "USD";
  existingMonths: number[];
};

export const buildMissingMonthlyCharges = ({
  studentId,
  gradeId,
  academicYear,
  monthlyAmount,
  currency,
  existingMonths,
}: BuildMissingMonthlyChargesInput) => {
  const existing = new Set(
    existingMonths
      .map((month) => Number(month))
      .filter((month) => Number.isFinite(month) && month >= 1 && month <= 12)
  );

  return Array.from({ length: 12 }, (_, idx) => idx + 1)
    .filter((month) => !existing.has(month))
    .map((month) => ({
      student_id: studentId,
      academic_year: academicYear,
      grade_id: gradeId,
      concept: "MENSUALIDAD",
      month,
      due_date: `${academicYear}-${String(month).padStart(2, "0")}-10`,
      amount: monthlyAmount,
      currency,
      status: "PENDIENTE",
      paid_amount: 0,
    }));
};

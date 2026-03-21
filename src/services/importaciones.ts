import { supabase } from "@/lib/supabase";

export type ParsedRow = Record<string, string>;

export type ValidationIssue = {
  row: number;
  message: string;
};

export type ImportResult = {
  processed: number;
  issues: ValidationIssue[];
};

const normalizeHeader = (header: string) =>
  String(header || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

function guardianKey(fullName: string, phoneDigits: string) {
  return `${String(fullName).trim()}|${phoneDigits}`;
}

function studentCompositeKey(fullName: string, guardianId: string) {
  return `${String(fullName).trim()}|${guardianId}`;
}

/** Agrupa estudiantes por nombre normalizado (detecta homónimos). */
function buildStudentsByNormalizedName(
  rows: { id: string; full_name: string | null; guardian_id: string | null }[]
) {
  const map = new Map<string, { id: string; full_name: string; guardian_id: string | null }[]>();
  for (const r of rows) {
    const name = String(r.full_name ?? "");
    const nk = normalizeHeader(name);
    const list = map.get(nk) ?? [];
    list.push({
      id: r.id,
      full_name: name,
      guardian_id: r.guardian_id,
    });
    map.set(nk, list);
  }
  return map;
}

function resolveStudentId(
  studentName: string,
  byName: Map<string, { id: string; full_name: string; guardian_id: string | null }[]>,
  rowNum: number,
  issues: ValidationIssue[]
): string | null {
  const list = byName.get(normalizeHeader(studentName));
  if (!list || list.length === 0) {
    issues.push({ row: rowNum, message: `Estudiante no encontrado: ${studentName}` });
    return null;
  }
  if (list.length > 1) {
    issues.push({
      row: rowNum,
      message: `Hay varios estudiantes con el mismo nombre "${studentName}". Corrige en el archivo o unifica en el sistema antes de importar.`,
    });
    return null;
  }
  return list[0].id;
}

export async function importStudents(
  rows: ParsedRow[],
  options?: { dryRun?: boolean }
): Promise<ImportResult> {
  const dryRun = Boolean(options?.dryRun);
  const issues: ValidationIssue[] = [];
  let processed = 0;

  const { data: grades, error: gradesErr } = await supabase
    .from("grades")
    .select("id,name");
  if (gradesErr) throw gradesErr;
  const gradesByName = new Map(
    (grades ?? []).map((g) => [normalizeHeader(String(g.name)), String(g.id)])
  );

  const { data: allSections, error: sectionsErr } = await supabase
    .from("sections")
    .select("id,name,grade_id");
  if (sectionsErr) throw sectionsErr;

  const { data: allGuardians, error: guardiansErr } = await supabase
    .from("guardians")
    .select("id,full_name,phone");
  if (guardiansErr) throw guardiansErr;

  const guardianByKey = new Map<string, string>();
  for (const g of allGuardians ?? []) {
    const phone = String(g.phone ?? "").replace(/\D/g, "").slice(0, 8);
    guardianByKey.set(guardianKey(String(g.full_name ?? ""), phone), String(g.id));
  }

  const { data: allStudents, error: studentsLoadErr } = await supabase
    .from("students")
    .select("id,full_name,guardian_id,grade_id,section_id");
  if (studentsLoadErr) throw studentsLoadErr;

  const studentByComposite = new Map<string, string>();
  for (const s of allStudents ?? []) {
    studentByComposite.set(
      studentCompositeKey(String(s.full_name ?? ""), String(s.guardian_id ?? "")),
      String(s.id)
    );
  }

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2;

    const studentName = row.nombre_estudiante;
    const tutorName = row.nombre_tutor;
    const tutorPhone = String(row.telefono_tutor || "").replace(/\D/g, "").slice(0, 8);
    const gradeName = row.grado;
    const sectionName = row.seccion;
    const status = row.estado === "INACTIVO" ? "INACTIVO" : "ACTIVO";

    if (!studentName || !tutorName || !tutorPhone || !gradeName) {
      issues.push({ row: rowNum, message: "Faltan campos obligatorios en estudiantes." });
      continue;
    }

    const gradeId = gradesByName.get(normalizeHeader(gradeName));
    if (!gradeId) {
      issues.push({ row: rowNum, message: `Grado no encontrado: ${gradeName}` });
      continue;
    }

    let sectionId: string | null = null;
    if (sectionName) {
      const section = (allSections ?? []).find(
        (s) =>
          String(s.grade_id) === gradeId &&
          normalizeHeader(String(s.name)) === normalizeHeader(sectionName)
      );
      if (!section) {
        issues.push({ row: rowNum, message: `Sección no encontrada: ${sectionName}` });
        continue;
      }
      sectionId = String(section.id);
    }

    const gKey = guardianKey(tutorName, tutorPhone);
    let guardianId = guardianByKey.get(gKey) ?? null;

    if (!guardianId) {
      if (dryRun) {
        guardianId = `dry-guardian-${rowNum}`;
        guardianByKey.set(gKey, guardianId);
      } else {
        const { data: insertedGuardian, error: guardianInsertErr } = await supabase
          .from("guardians")
          .insert({ full_name: tutorName, phone: tutorPhone })
          .select("id")
          .single();
        if (guardianInsertErr) throw guardianInsertErr;
        guardianId = String(insertedGuardian.id);
        guardianByKey.set(gKey, guardianId);
      }
    }

    const sKey = studentCompositeKey(studentName, guardianId);
    const existingStudentId = studentByComposite.get(sKey) ?? null;

    if (existingStudentId) {
      if (!dryRun) {
        const { error: updateErr } = await supabase
          .from("students")
          .update({
            grade_id: gradeId,
            section_id: sectionId,
            status,
          })
          .eq("id", existingStudentId);
        if (updateErr) throw updateErr;
      }
    } else {
      if (dryRun) {
        const fakeId = `dry-student-${rowNum}`;
        studentByComposite.set(sKey, fakeId);
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("students")
          .insert({
            full_name: studentName,
            guardian_id: guardianId,
            grade_id: gradeId,
            section_id: sectionId,
            status,
          })
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        studentByComposite.set(sKey, String(inserted.id));
      }
    }

    processed += 1;
  }

  return { processed, issues };
}

export async function importEnrollments(
  rows: ParsedRow[],
  options?: { dryRun?: boolean }
): Promise<ImportResult> {
  const dryRun = Boolean(options?.dryRun);
  const issues: ValidationIssue[] = [];
  let processed = 0;

  const { data: studentRows, error: studentsErr } = await supabase
    .from("students")
    .select("id,full_name,guardian_id");
  if (studentsErr) throw studentsErr;

  const byName = buildStudentsByNormalizedName(studentRows ?? []);

  type Resolved = { rowNum: number; studentId: string; year: number; total: number; paid: number; currency: "NIO" | "USD"; status: string; enrolledAt: string };
  const resolved: Resolved[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2;

    const studentName = row.nombre_estudiante;
    const year = Number(row.academic_year);
    const total = Number(row.total_amount);
    const paid = Number(row.paid_amount);
    const currency = row.currency === "USD" ? "USD" : "NIO";
    const statusRaw = row.status;
    const status =
      statusRaw === "PENDIENTE" || statusRaw === "PARCIAL" || statusRaw === "PAGADO"
        ? statusRaw
        : paid >= total
          ? "PAGADO"
          : paid > 0
            ? "PARCIAL"
            : "PENDIENTE";
    const enrolledAt = row.enrolled_at || new Date().toISOString();

    if (!studentName || !Number.isFinite(year) || !Number.isFinite(total) || !Number.isFinite(paid)) {
      issues.push({ row: rowNum, message: "Fila de matrícula inválida." });
      continue;
    }

    const studentId = resolveStudentId(studentName, byName, rowNum, issues);
    if (!studentId) continue;

    resolved.push({
      rowNum,
      studentId,
      year,
      total,
      paid,
      currency,
      status,
      enrolledAt,
    });
  }

  if (resolved.length === 0) {
    return { processed, issues };
  }

  const studentIds = [...new Set(resolved.map((r) => r.studentId))];
  const years = [...new Set(resolved.map((r) => r.year))];

  const { data: enrollmentRows, error: enrErr } = await supabase
    .from("enrollments")
    .select("id,student_id,academic_year,total_amount,paid_amount,currency,status")
    .in("student_id", studentIds)
    .in("academic_year", years);
  if (enrErr) throw enrErr;

  const enrollmentByKey = new Map<string, { id: string }>();
  for (const e of enrollmentRows ?? []) {
    enrollmentByKey.set(`${e.student_id}-${e.academic_year}`, {
      id: String(e.id),
    });
  }

  const { data: matriculaPayments, error: payLoadErr } = await supabase
    .from("payments")
    .select("id,student_id,academic_year,amount")
    .eq("concept", "MATRICULA")
    .in("student_id", studentIds)
    .in("academic_year", years);
  if (payLoadErr) throw payLoadErr;

  const matriculaPaymentExists = new Set<string>();
  for (const p of matriculaPayments ?? []) {
    matriculaPaymentExists.add(
      `${p.student_id}-${p.academic_year}-${Number(p.amount)}`
    );
  }

  for (const r of resolved) {
    const key = `${r.studentId}-${r.year}`;
    const existingEnrollment = enrollmentByKey.get(key);

    if (existingEnrollment?.id) {
      if (!dryRun) {
        const { error: updateErr } = await supabase
          .from("enrollments")
          .update({
            total_amount: r.total,
            paid_amount: r.paid,
            change_amount: 0,
            currency: r.currency,
            status: r.status,
          })
          .eq("id", existingEnrollment.id);
        if (updateErr) throw updateErr;
      }
    } else {
      if (!dryRun) {
        const { data: inserted, error: insertErr } = await supabase.from("enrollments").insert({
          student_id: r.studentId,
          academic_year: r.year,
          total_amount: r.total,
          paid_amount: r.paid,
          change_amount: 0,
          currency: r.currency,
          status: r.status,
          enrolled_at: r.enrolledAt,
        }).select("id").single();
        if (insertErr) throw insertErr;
        enrollmentByKey.set(key, { id: String(inserted.id) });
      }
    }

    if (r.paid > 0) {
      const payKey = `${r.studentId}-${r.year}-${r.paid}`;
      if (!matriculaPaymentExists.has(payKey)) {
        if (!dryRun) {
          const { error: paymentInsertErr } = await supabase.from("payments").insert({
            student_id: r.studentId,
            concept: "MATRICULA",
            amount: r.paid,
            received_amount: r.paid,
            change_amount: 0,
            currency: r.currency,
            academic_year: r.year,
            paid_at: r.enrolledAt,
            method: r.currency === "USD" ? "DOLAR" : "EFECTIVO",
            description: r.status,
            status: "COMPLETADO",
          });
          if (paymentInsertErr) throw paymentInsertErr;
        }
        matriculaPaymentExists.add(payKey);
      }
    }

    processed += 1;
  }

  return { processed, issues };
}

type ChargeRow = {
  id: string;
  student_id: string;
  academic_year: number;
  month: number;
  amount: number | null;
  paid_amount: number | null;
  currency: string | null;
  status: string | null;
  created_at: string | null;
};

export async function importMonthlyPayments(
  rows: ParsedRow[],
  options?: { dryRun?: boolean }
): Promise<ImportResult> {
  const dryRun = Boolean(options?.dryRun);
  const issues: ValidationIssue[] = [];
  let processed = 0;

  const { data: studentRows, error: studentsErr } = await supabase
    .from("students")
    .select("id,full_name,guardian_id");
  if (studentsErr) throw studentsErr;

  const byName = buildStudentsByNormalizedName(studentRows ?? []);

  type RowParsed = {
    rowNum: number;
    studentName: string;
    studentId: string;
    year: number;
    month: number;
    amount: number;
    received: number;
    currency: "NIO" | "USD";
    paidAt: string;
    method: string;
  };

  const parsedRows: RowParsed[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2;

    const studentName = row.nombre_estudiante;
    const year = Number(row.academic_year);
    const month = Number(row.month);
    const amount = Number(row.amount);
    const received = Number(row.received_amount || row.amount);
    const currency = row.currency === "USD" ? "USD" : "NIO";
    const paidAt = row.paid_at || new Date().toISOString();
    const method = row.method || (currency === "USD" ? "DOLAR" : "EFECTIVO");

    if (
      !studentName ||
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isFinite(amount)
    ) {
      issues.push({ row: rowNum, message: "Fila de mensualidad inválida." });
      continue;
    }

    const studentId = resolveStudentId(studentName, byName, rowNum, issues);
    if (!studentId) continue;

    parsedRows.push({
      rowNum,
      studentName,
      studentId,
      year,
      month,
      amount,
      received,
      currency,
      paidAt,
      method,
    });
  }

  if (parsedRows.length === 0) {
    return { processed, issues };
  }

  const studentIds = [...new Set(parsedRows.map((r) => r.studentId))];

  const { data: chargeData, error: chargeErr } = await supabase
    .from("charges")
    .select("id,student_id,academic_year,month,amount,paid_amount,currency,status,created_at")
    .eq("concept", "MENSUALIDAD")
    .in("student_id", studentIds);
  if (chargeErr) throw chargeErr;

  const chargeByStudentYearMonth = new Map<string, ChargeRow>();
  for (const c of chargeData ?? []) {
    const row: ChargeRow = {
      id: String(c.id),
      student_id: String(c.student_id),
      academic_year: Number(c.academic_year),
      month: Number(c.month),
      amount: c.amount != null ? Number(c.amount) : null,
      paid_amount: c.paid_amount != null ? Number(c.paid_amount) : null,
      currency: c.currency != null ? String(c.currency) : null,
      status: c.status != null ? String(c.status) : null,
      created_at: c.created_at != null ? String(c.created_at) : null,
    };
    const ck = `${row.student_id}-${row.academic_year}-${row.month}`;
    const prev = chargeByStudentYearMonth.get(ck);
    if (!prev) {
      chargeByStudentYearMonth.set(ck, row);
    } else {
      const prevT = prev.created_at ? new Date(prev.created_at).getTime() : 0;
      const curT = row.created_at ? new Date(row.created_at).getTime() : 0;
      if (curT >= prevT) chargeByStudentYearMonth.set(ck, row);
    }
  }

  const { data: existingPayRows, error: payErr } = await supabase
    .from("payments")
    .select("id,student_id,academic_year,month,amount,currency")
    .eq("concept", "MENSUALIDAD")
    .in("student_id", studentIds);
  if (payErr) throw payErr;

  const paymentDupKeys = new Set<string>();
  for (const p of existingPayRows ?? []) {
    paymentDupKeys.add(
      `${p.student_id}-${p.academic_year}-${p.month}-${Number(p.amount)}-${p.currency}`
    );
  }

  /** Estado acumulado por fila (misma importación puede tocar el mismo cargo varias veces). */
  const chargeRollingState = new Map<string, { paid_amount: number; status: string; amount: number }>();
  for (const [, ch] of chargeByStudentYearMonth) {
    chargeRollingState.set(ch.id, {
      paid_amount: Number(ch.paid_amount ?? 0),
      status: String(ch.status ?? "PENDIENTE"),
      amount: Number(ch.amount ?? 0),
    });
  }

  for (const r of parsedRows) {
    const ck = `${r.studentId}-${r.year}-${r.month}`;
    const charge = chargeByStudentYearMonth.get(ck);
    if (!charge?.id) {
      issues.push({
        row: r.rowNum,
        message: `No existe cargo de mensualidad para ${r.studentName} mes ${r.month}.`,
      });
      continue;
    }

    if (charge.currency !== r.currency) {
      issues.push({
        row: r.rowNum,
        message: `Moneda distinta al cargo (${charge.currency}). Importa con la misma moneda del cargo.`,
      });
      continue;
    }

    const state = chargeRollingState.get(charge.id) ?? {
      paid_amount: Number(charge.paid_amount ?? 0),
      status: String(charge.status ?? "PENDIENTE"),
      amount: Number(charge.amount ?? 0),
    };

    const totalCharge = state.amount;
    const paidSoFar = state.paid_amount;
    const remaining = Math.max(totalCharge - paidSoFar, 0);
    if (remaining <= 0.0001 || state.status === "PAGADO") {
      issues.push({
        row: r.rowNum,
        message: `Cargo ya pagado para ${r.studentName} mes ${r.month}.`,
      });
      continue;
    }

    const applied = Math.min(r.amount, remaining);
    const nextPaid = paidSoFar + applied;
    const newStatus = nextPaid + 0.0001 >= totalCharge ? "PAGADO" : "PARCIAL";
    const change = Math.max(r.received - applied, 0);

    const dupKey = `${r.studentId}-${r.year}-${r.month}-${applied}-${r.currency}`;
    if (!paymentDupKeys.has(dupKey)) {
      if (!dryRun) {
        const { error: paymentInsertErr } = await supabase.from("payments").insert({
          student_id: r.studentId,
          charge_id: charge.id,
          concept: "MENSUALIDAD",
          academic_year: r.year,
          month: r.month,
          amount: Number(applied.toFixed(2)),
          received_amount: Number(r.received.toFixed(2)),
          change_amount: Number(change.toFixed(2)),
          currency: r.currency,
          method: r.method,
          paid_at: r.paidAt,
          status: "COMPLETADO",
          description: newStatus,
        });
        if (paymentInsertErr) throw paymentInsertErr;
      }
      paymentDupKeys.add(dupKey);
    }

    if (!dryRun) {
      const { error: chargeUpdateErr } = await supabase
        .from("charges")
        .update({
          paid_amount: Number(nextPaid.toFixed(2)),
          status: newStatus,
        })
        .eq("id", charge.id);
      if (chargeUpdateErr) throw chargeUpdateErr;
    }

    chargeRollingState.set(charge.id, {
      amount: totalCharge,
      paid_amount: Number(nextPaid.toFixed(2)),
      status: newStatus,
    });

    processed += 1;
  }

  return { processed, issues };
}

export { normalizeHeader };

import { useState, useMemo, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateFinancialViews } from "@/lib/queryKeys";
import type { Tables } from "@/types/database.types";
import { imprimirReciboMatricula } from "@/utils/imprimirReciboMatricula";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormField } from "@/components/common/FormField";
import {
  DEFAULT_EXCHANGE_RATE,
  convertCurrency,
  formatMoney,
  normalizeCurrency,
} from "@/lib/billing";
import { useEnrollmentFlow } from "@/hooks/useEnrollmentFlow";
import { canApplyInputChange } from "@/lib/paymentValidation";
import { mapSupabaseErrorToToast } from "@/lib/errorHandling";
import { buildMissingMonthlyCharges } from "@/services/charges";
import { receiptNumberForPrint, suggestNextReceiptNumber } from "@/lib/receiptNumber";

type StudentRow = {
  id: string;
  grade_id?: string | null;
  full_name: string;
  grades?: { name?: string | null } | null;
  sections?: { name?: string | null } | null;
};

type EnrollmentRow = {
  id: string;
  student_id: string;
  total_amount: number;
  paid_amount: number;
  enrolled_at?: string | null;
  currency: "NIO" | "USD";
  status: "PENDIENTE" | "PARCIAL" | "PAGADO";
  students?: {
    full_name?: string | null;
    grades?: { name?: string | null } | null;
    sections?: { name?: string | null } | null;
  } | null;
};

type MatriculaPaymentRow = {
  id: string;
  receipt_number?: string | null;
  amount: number;
  received_amount: number;
  change_amount: number;
  currency: "NIO" | "USD";
  description?: string | null;
  paid_at: string;
  students?: {
    full_name?: string | null;
    grades?: { name?: string | null } | null;
    sections?: { name?: string | null } | null;
  } | null;
};

type MatriculaSummaryRow = {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  grade_name: string;
  section_name: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  currency: "NIO" | "USD";
  status: "PENDIENTE" | "PARCIAL" | "PAGADO";
  latest_payment_amount: number | null;
  latest_payment_date: string | null;
  latest_payment_receipt: string | null;
  latest_payment_id: string | null;
};

const EMPTY_ENROLLMENTS: EnrollmentRow[] = [];
const EMPTY_STUDENTS: StudentRow[] = [];
const EMPTY_PAYMENTS: MatriculaPaymentRow[] = [];

const deriveEnrollmentStatus = (
  totalAmount: number,
  paidAmount: number
): "PENDIENTE" | "PARCIAL" | "PAGADO" => {
  if (paidAmount <= 0.0001) return "PENDIENTE";
  if (paidAmount + 0.0001 >= totalAmount) return "PAGADO";
  return "PARCIAL";
};

/* ================= FETCH ================= */

const fetchData = async (year: number) => {
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select(`
      id,
      student_id,
      total_amount,
      paid_amount,
      change_amount,
      currency,
      status,
      enrolled_at,
      students (
        full_name,
        grades ( name ),
        sections ( name )
      )
    `)
    .eq("academic_year", year)
    .order("enrolled_at", { ascending: false });

  if (enrollmentsError) throw enrollmentsError;

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(`
      id,
      grade_id,
      full_name,
      grades ( name ),
      sections ( name ),
      guardians ( full_name, phone )
    `)
    .order("full_name");

  if (studentsError) throw studentsError;

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select(`
      id,
      receipt_number,
      student_id,
      amount,
      received_amount,
      change_amount,
      currency,
      concept,
      description,
      paid_at,
      students (
        full_name,
        grades ( name ),
        sections ( name )
      )
    `)
    .eq("concept", "MATRICULA")
    .eq("academic_year", year)
    .order("paid_at", { ascending: false });

  if (paymentsError) throw paymentsError;

  return {
    enrollments: (enrollments ?? []) as EnrollmentRow[],
    students: (students ?? []) as StudentRow[],
    payments: (payments ?? []) as MatriculaPaymentRow[],
  };
};

/* ================= COMPONENT ================= */

export default function Matriculas() {
  const qc = useQueryClient();

  const { data: matriculaSettings } = useQuery({
    queryKey: ["enrollment-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment_pricing")
        .select("general_amount, currency")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const amount = Number(data.general_amount ?? 300);
        const currency = normalizeCurrency(String(data.currency ?? "NIO"));
        const rate = DEFAULT_EXCHANGE_RATE;
        return currency === "USD"
          ? { matriculaNio: amount * rate, matriculaUsd: amount }
          : { matriculaNio: amount, matriculaUsd: amount / rate };
      }

      return { matriculaNio: 300, matriculaUsd: 8 };
    },
  });

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data } = useQuery({
    queryKey: ["matriculas", year],
    queryFn: () => fetchData(year),
  });

  const [saldoPendiente, setSaldoPendiente] = useState(0);

  const enrollments = data?.enrollments ?? EMPTY_ENROLLMENTS;
  const students = data?.students ?? EMPTY_STUDENTS;
  const payments = data?.payments ?? EMPTY_PAYMENTS;

  /* ================= STATE ================= */

  const [openAdd, setOpenAdd] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

  const [currency, setCurrency] = useState<"NIO" | "USD">("NIO");
  const [recibidoInput, setRecibidoInput] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [total, setTotal] = useState(300);
  const [enrollmentHint, setEnrollmentHint] = useState("");
  const [matriculaReceiptNumber, setMatriculaReceiptNumber] = useState("");

  const prevMatriculaDialogOpen = useRef(false);
  useEffect(() => {
    const justOpened = openAdd && !prevMatriculaDialogOpen.current;
    prevMatriculaDialogOpen.current = openAdd;
    if (!justOpened) return;
    let cancelled = false;
    suggestNextReceiptNumber(year).then((n) => {
      if (!cancelled) setMatriculaReceiptNumber(n);
    });
    return () => {
      cancelled = true;
    };
  }, [openAdd, year]);

  const enrollmentFlow = useEnrollmentFlow({
    currency,
    saldoPendiente,
    recibidoInput,
  });

  const cambio = enrollmentFlow.cambio;

  const filteredStudents = useMemo(() => {
    if (!search) return [];
    return students.filter((s) =>
      `${s.full_name} ${s.grades?.name ?? ""} ${s.sections?.name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [students, search]);

  const enrollmentSummaries = useMemo<MatriculaSummaryRow[]>(() => {
    const latestPaymentByStudent = new Map<string, MatriculaPaymentRow>();
    payments.forEach((payment) => {
      const prev = latestPaymentByStudent.get(payment.student_id);
      if (!prev) {
        latestPaymentByStudent.set(payment.student_id, payment);
        return;
      }
      const prevTime = new Date(prev.paid_at).getTime();
      const curTime = new Date(payment.paid_at).getTime();
      if (curTime >= prevTime) latestPaymentByStudent.set(payment.student_id, payment);
    });

    return enrollments.map((enrollment) => {
      const total = Number(enrollment.total_amount || 0);
      const paid = Number(enrollment.paid_amount || 0);
      const pending = Math.max(total - paid, 0);
      const computedStatus = deriveEnrollmentStatus(total, paid);
      const latestPayment = latestPaymentByStudent.get(enrollment.student_id);

      return {
        enrollment_id: enrollment.id,
        student_id: enrollment.student_id,
        student_name: enrollment.students?.full_name ?? "—",
        grade_name: enrollment.students?.grades?.name ?? "—",
        section_name: enrollment.students?.sections?.name ?? "—",
        total_amount: total,
        paid_amount: paid,
        pending_amount: pending,
        currency: normalizeCurrency(enrollment.currency),
        status: computedStatus,
        latest_payment_amount: latestPayment ? Number(latestPayment.amount || 0) : null,
        latest_payment_date: latestPayment?.paid_at ?? null,
        latest_payment_receipt: latestPayment?.receipt_number ?? null,
        latest_payment_id: latestPayment?.id ?? null,
      };
    });
  }, [enrollments, payments]);

  const filteredSummaries = useMemo(() => {
    if (!tableSearch) return enrollmentSummaries;
    const searchValue = tableSearch.toLowerCase();
    return enrollmentSummaries.filter((row) => {
      const fecha = row.latest_payment_date
        ? new Date(row.latest_payment_date).toLocaleString("es-NI", {
            timeZone: "America/Managua",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).toLowerCase()
        : "";
      return (
        row.student_name.toLowerCase().includes(searchValue) ||
        row.grade_name.toLowerCase().includes(searchValue) ||
        row.section_name.toLowerCase().includes(searchValue) ||
        String(row.total_amount).includes(searchValue) ||
        String(row.paid_amount).includes(searchValue) ||
        String(row.pending_amount).includes(searchValue) ||
        String(row.currency).toLowerCase().includes(searchValue) ||
        String(row.status).toLowerCase().includes(searchValue) ||
        String(row.latest_payment_receipt ?? "").toLowerCase().includes(searchValue) ||
        fecha.includes(searchValue)
      );
    });
  }, [enrollmentSummaries, tableSearch]);

  const isPaidValid = enrollmentFlow.validation.isValid;

  /* ================= MUTATION ================= */

  const createEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error("NO_STUDENT");
      if (!isPaidValid) throw new Error("MONTO_INVALIDO");
      const receiptTrim = matriculaReceiptNumber.trim();
      if (!receiptTrim) throw new Error("RECIBO_REQUERIDO");

      const now = new Date().toISOString();

      const { data: existingRaw, error: existingError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .eq("academic_year", year)
        .maybeSingle();

      if (existingError) throw existingError;
      const existing = existingRaw as Tables<"enrollments"> | null;

      let montoAplicado = 0;
      let cambioPago = 0;
      let statusPago: "PENDIENTE" | "PARCIAL" | "PAGADO" = "PENDIENTE";

      const ensureMonthlyCharges = async () => {
        const gradeId = selectedStudent?.grade_id;
        if (!gradeId) return;

        const { data: priceRowRaw } = await supabase
          .from("grade_prices")
          .select("*")
          .eq("grade_id", gradeId)
          .maybeSingle();

        const priceRow = priceRowRaw as Tables<"grade_prices"> | null;

        const amountNio = Number(priceRow?.monthly_amount ?? 770);

        const amountUsd = Number(priceRow?.monthly_amount_usd ?? 21);

        const chargeCurrency: "NIO" | "USD" =
          priceRow?.currency === "USD" ? "USD" : "NIO";

        const monthlyAmount =
          chargeCurrency === "USD"
            ? amountUsd || 21
            : amountNio || 770;

        const { data: existingCharges, error: existingChargesError } = await supabase
          .from("charges")
          .select("month")
          .eq("student_id", selectedStudent.id)
          .eq("academic_year", year)
          .eq("concept", "MENSUALIDAD");

        if (existingChargesError) throw existingChargesError;

        const existingMonths = (existingCharges ?? []).map((c: { month: number }) =>
          Number(c.month)
        );
        const missingRows = buildMissingMonthlyCharges({
          studentId: selectedStudent.id,
          gradeId,
          academicYear: year,
          monthlyAmount,
          currency: chargeCurrency,
          existingMonths,
        });

        if (missingRows.length === 0) return;

        const { error: insertChargesError } = await supabase
          .from("charges")
          .insert(missingRows);

        if (insertChargesError && insertChargesError.code !== "23505") {
          throw insertChargesError;
        }
      };

      if (!existing) {
        const totalOriginal = Number(total);
        montoAplicado = Math.min(enrollmentFlow.paid, totalOriginal);
        cambioPago = Math.max(enrollmentFlow.paid - montoAplicado, 0);

        statusPago = deriveEnrollmentStatus(totalOriginal, montoAplicado);

        const { error: insertEnrollmentError } = await supabase
          .from("enrollments")
          .insert({
            student_id: selectedStudent.id,
            academic_year: year,
            total_amount: totalOriginal,
            paid_amount: montoAplicado,
            change_amount: cambioPago,
            currency,
            status: statusPago,
            enrolled_at: now,
          });

        if (insertEnrollmentError) throw insertEnrollmentError;
        await ensureMonthlyCharges();
      } else {
        const totalOriginal = Number(existing.total_amount);
        const alreadyPaid = Number(existing.paid_amount);
        const restante = totalOriginal - alreadyPaid;

        if (restante <= 0) {
          throw new Error("YA_PAGADO");
        }

        montoAplicado = Math.min(enrollmentFlow.paid, restante);
        cambioPago = Math.max(enrollmentFlow.paid - montoAplicado, 0);

        if (montoAplicado <= 0) {
          throw new Error("YA_PAGADO");
        }

        const newPaid = alreadyPaid + montoAplicado;
        statusPago = deriveEnrollmentStatus(totalOriginal, newPaid);

        const { error: updateEnrollmentError } = await supabase
          .from("enrollments")
          .update({
            paid_amount: newPaid,
            change_amount: cambioPago,
            status: statusPago,
          })
          .eq("id", existing.id);

        if (updateEnrollmentError) throw updateEnrollmentError;
        await ensureMonthlyCharges();
      }

      const { data: payRow, error: paymentError } = await supabase
        .from("payments")
        .insert({
          student_id: selectedStudent.id,
          concept: "MATRICULA",
          amount: montoAplicado,
          received_amount: enrollmentFlow.paid,
          change_amount: cambioPago,
          currency,
          academic_year: year,
          paid_at: now,
          description: statusPago,
          method: currency === "USD" ? "DOLAR" : "EFECTIVO",
          receipt_number: receiptTrim,
        })
        .select("id")
        .single();

      if (paymentError) throw paymentError;
      if (!payRow?.id) throw new Error("PAYMENT_INSERT_FAILED");

      return {
        paidAt: now,
        paymentId: payRow.id as string,
        receiptNumber: receiptTrim,
        montoAplicado,
        cambioPago,
        statusPago,
      };
    },

    onSuccess: async (result) => {
      await invalidateFinancialViews(qc, { year });

      setOpenAdd(false);

      setTimeout(() => {
        imprimirReciboMatricula({
          numero: receiptNumberForPrint(result.receiptNumber, result.paymentId),
          fecha: new Date(result.paidAt).toLocaleDateString("es-NI", {
            timeZone: "America/Managua",
          }),
          estudiante: selectedStudent.full_name,
          grado: selectedStudent.grades?.name ?? "",
          anio: String(year),
          nivel: selectedStudent.sections?.name ?? "",
          montoCordobas:
            currency === "NIO" ? Number(enrollmentFlow.paid).toFixed(2) : "",
          montoDolares:
            currency === "USD" ? Number(enrollmentFlow.paid).toFixed(2) : "",
          sumaDe: `${currency === "USD" ? "$" : "C$"} ${Number(result.montoAplicado || 0).toFixed(2)}`,
          concepto: "Pago de matrícula",
        });
      }, 300);

      setMatriculaReceiptNumber("");
      setRecibidoInput("");
      setSearch("");
      setSelectedStudent(null);
      setSaldoPendiente(0);
      setTotal(300);
      setCurrency("NIO");
    },

    onError: (err: unknown) => {
      const message = mapSupabaseErrorToToast(err, {
        currency,
        fallback: "Error al registrar matrícula.",
        customMap: {
          YA_PAGADO: "Esta matrícula ya está completamente pagada.",
          RECIBO_REQUERIDO: "El número de recibo es obligatorio.",
          RECEIPT_REQUIRED: "El número de recibo es obligatorio.",
          RECEIPT_NOT_NUMERIC: "El número de recibo debe contener solo dígitos.",
          MONTO_INVALIDO:
            currency === "USD"
              ? "Recibido inválido. En USD se permiten hasta 3 cifras (999.99)."
              : "Recibido inválido. En C$ se permiten hasta 4 cifras (9999.99).",
        },
      });
      if (message.includes("RECEIPT_DUPLICATE:")) {
        const duplicated = message.split("RECEIPT_DUPLICATE:")[1]?.trim();
        setInfoMsg(`El número de recibo ${duplicated || ""} ya fue utilizado`.trim());
        setOpenInfo(true);
        return;
      }
      if (message.includes("ya está completamente pagada")) {
        setInfoMsg("Esta matrícula ya está completamente pagada.");
      } else {
        setInfoMsg(message);
      }
      setOpenInfo(true);
    },
  });

  /* ================= UI ================= */

  return (
    <DashboardLayout title="Matrículas" subtitle="Pago de matrícula">
      <div className="flex justify-end mb-6">
        <Dialog
          open={openAdd}
          onOpenChange={(v) => {
            setOpenAdd(v);
            if (!v) setMatriculaReceiptNumber("");
          }}
        >
          <DialogTrigger asChild>
            <Button className="h-11 text-base">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Matrícula
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pago de Matrícula</DialogTitle>
              <DialogDescription>
                Elige estudiante, moneda y registra el pago.
              </DialogDescription>
            </DialogHeader>

            {/* ESTUDIANTE */}
            <div>
              <label className="text-sm font-semibold block mb-2">Estudiante</label>
              <p className="text-xs text-muted-foreground mb-2">Busca y selecciona un estudiante.</p>
              <label className="text-sm font-medium">Estudiante</label>
              <Input
                placeholder="Buscar estudiante..."
                className="h-10 text-sm mt-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {search && (
                <div className="border rounded max-h-40 overflow-y-auto mt-2 bg-background">
                  {filteredStudents.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">
                      No se encontraron estudiantes con esa búsqueda.
                    </p>
                  )}
                  {filteredStudents.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 hover:bg-muted cursor-pointer flex gap-2 border-b last:border-b-0"
                      onClick={async () => {
                        const { data: existingRaw } = await supabase
                          .from("enrollments")
                          .select("*")
                          .eq("student_id", s.id)
                          .eq("academic_year", year)
                          .maybeSingle();

                        const existing = existingRaw as Tables<"enrollments"> | null;

                        if (existing) {
                          const totalOriginal = Number(existing.total_amount);
                          const alreadyPaid = Number(existing.paid_amount);
                          const restante = totalOriginal - alreadyPaid;

                          setTotal(totalOriginal);
                          setSaldoPendiente(Math.max(restante, 0));
                          setCurrency(normalizeCurrency(existing.currency));
                          setEnrollmentHint(
                            restante <= 0
                              ? "Este estudiante ya está matriculado y su matrícula está pagada en este año."
                              : "Este estudiante ya está matriculado. Solo se cobrará el saldo pendiente."
                          );
                        } else {
                          const base =
                            currency === "USD"
                              ? (matriculaSettings?.matriculaUsd ?? 8)
                              : (matriculaSettings?.matriculaNio ?? 300);
                          setTotal(base);
                          setSaldoPendiente(base);
                          setEnrollmentHint("");
                        }

                        setRecibidoInput("");
                        setSelectedStudent(s);
                        setSearch(s.full_name);
                      }}
                    >
                      <User className="h-4 w-4 mt-1" />
                      <div>
                        <p className="font-medium text-sm">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.grades?.name}{" "}
                          {s.sections?.name ? `- ${s.sections?.name}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedStudent && (
                <div className="mt-3 rounded-md border bg-background p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Seleccionado</p>
                    <p className="font-medium text-sm">{selectedStudent.full_name}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-xs"
                    onClick={() => {
                      setSelectedStudent(null);
                      setSearch("");
                      setSaldoPendiente(0);
                      setRecibidoInput("");
                      setEnrollmentHint("");
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
              )}
            </div>

            {!selectedStudent && (
              <p className="text-xs text-red-500 mt-1">
                Debe seleccionar un estudiante
              </p>
            )}

            {/* TOTAL + MONEDA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-sm font-medium">Saldo matrícula</label>
                <Input className="h-10 text-sm" type="text" value={formatMoney(saldoPendiente, currency)} disabled />
              </div>

              <div>
                <label className="text-sm font-medium">Moneda</label>
                <select
                  className="w-full border rounded px-3 py-2 h-10 text-sm"
                  value={currency}
                  onChange={(e) => {
                    const v = e.target.value as "NIO" | "USD";
                    setCurrency(v);

                    if (selectedStudent) {
                      const enrollment = enrollments.find(
                        (en) => en.student_id === selectedStudent.id
                      );

                      if (enrollment) {
                        const restante =
                          Number(enrollment.total_amount) -
                          Number(enrollment.paid_amount);
                        const baseCurrency = normalizeCurrency(enrollment.currency);
                        const converted =
                          v === baseCurrency
                            ? restante
                            : convertCurrency(
                                restante,
                                baseCurrency,
                                v,
                                DEFAULT_EXCHANGE_RATE
                              );
                        setSaldoPendiente(Math.max(Number(converted.toFixed(2)), 0));
                      } else {
                        // Si aún no existe matrícula, usar el precio base según moneda elegida.
                        const base =
                          v === "USD"
                            ? Number(matriculaSettings?.matriculaUsd ?? 8)
                            : Number(matriculaSettings?.matriculaNio ?? 300);
                        setSaldoPendiente(Math.max(base, 0));
                        setTotal(Math.max(base, 0));
                      }
                    }

                    setRecibidoInput("");
                  }}
                >
                  <option value="NIO">Córdobas (C$)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
            </div>

            {enrollmentHint && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {enrollmentHint}
              </div>
            )}

            <div className="mt-4">
              <label className="text-sm font-medium block mb-2">
                N° recibo
              </label>
              <div className="flex gap-2">
                <Input
                  className="h-10 text-sm"
                  placeholder="Correlativo sugerido al abrir; puedes editarlo"
                  value={matriculaReceiptNumber}
                  onChange={(e) => setMatriculaReceiptNumber(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 text-xs"
                  onClick={async () => {
                    const next = await suggestNextReceiptNumber(year);
                    setMatriculaReceiptNumber(next);
                  }}
                >
                  Usar siguiente
                </Button>
              </div>
            </div>

            {/* RECIBIDO + CAMBIO */}
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                label="Dinero recibido"
                hint={`Máximo ${currency === "USD" ? "3" : "4"} cifras (${currency === "USD" ? "999.99" : "9999.99"}).`}
                error={recibidoInput && !isPaidValid ? "Ingresa un monto válido para continuar." : undefined}
              >
                <Input
                  inputMode="decimal"
                  className="h-10 text-sm"
                  value={recibidoInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(",", ".");
                    if (!canApplyInputChange(raw, currency)) return;
                    setRecibidoInput(raw);
                  }}
                />
              </FormField>

              <div>
                <label className="text-sm font-medium">Cambio</label>
                <Input
                  disabled
                  className="h-10 text-sm"
                  value={formatMoney(cambio, currency)}
                />
              </div>
            </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs"
                  onClick={() => {
                    const exacto = Number(saldoPendiente.toFixed(2));
                    setRecibidoInput(exacto.toString());
                  }}
                >
                  Monto exacto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs"
                  onClick={() => {
                    const mitad = Number((saldoPendiente / 2).toFixed(2));
                    setRecibidoInput(mitad.toString());
                  }}
                >
                  Mitad
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 text-xs"
                  onClick={() => {
                    setRecibidoInput("");
                  }}
                >
                  Limpiar
                </Button>
              </div>
            </div>

            {/* BOTÓN */}
            <Button
              className="w-full mt-4 h-10 text-sm font-semibold"
              disabled={!selectedStudent || !matriculaReceiptNumber.trim() || !isPaidValid || saldoPendiente === 0}
              onClick={() => createEnrollment.mutate()}
            >
              {createEnrollment.isPending ? "Registrando..." : "Registrar Pago"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={openInfo} onOpenChange={setOpenInfo}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Atención</DialogTitle>
            <DialogDescription>
              Información del resultado del proceso de matrícula.
            </DialogDescription>
          </DialogHeader>
          <p>{infoMsg}</p>
          <Button className="mt-4 w-full" onClick={() => setOpenInfo(false)}>
            Aceptar
          </Button>
        </DialogContent>
      </Dialog>

      {/* FILTRO AÑO + BUSCADOR */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
        <div className="w-full md:w-40">
          <label className="text-sm font-medium block mb-1">Año</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = currentYear - i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium block mb-1">Buscar</label>
          <Input
            placeholder="Estudiante, grado, sección, total, pagado, saldo, estado o recibo..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA RESUMEN DE MATRÍCULAS */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estudiante</TableHead>
            <TableHead>Grado</TableHead>
            <TableHead>Sección</TableHead>
            <TableHead>Total matrícula</TableHead>
            <TableHead>Pagado</TableHead>
            <TableHead>Saldo pendiente</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Último abono</TableHead>
            <TableHead>Fecha último pago</TableHead>
            <TableHead>N° recibo</TableHead>
            <TableHead className="text-center">Acción</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredSummaries.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                No hay matrículas para este filtro.
              </TableCell>
            </TableRow>
          )}
          {filteredSummaries.map((row) => (
            <TableRow key={row.enrollment_id}>
              <TableCell>{row.student_name}</TableCell>

              <TableCell>{row.grade_name}</TableCell>

              <TableCell>{row.section_name}</TableCell>

              <TableCell>
                {formatMoney(row.total_amount, row.currency)}
              </TableCell>

              <TableCell>
                {formatMoney(row.paid_amount, row.currency)}
              </TableCell>

              <TableCell>
                {formatMoney(row.pending_amount, row.currency)}
              </TableCell>

              <TableCell>{row.currency === "USD" ? "Dólares" : "Córdobas"}</TableCell>

              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>

              <TableCell>
                {row.latest_payment_amount != null
                  ? formatMoney(row.latest_payment_amount, row.currency)
                  : "—"}
              </TableCell>

              <TableCell className="text-muted-foreground text-sm">
                {row.latest_payment_date
                  ? new Date(row.latest_payment_date).toLocaleString("es-NI", {
                      timeZone: "America/Managua",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </TableCell>

              <TableCell className="text-muted-foreground text-sm">
                {row.latest_payment_id
                  ? receiptNumberForPrint(row.latest_payment_receipt, row.latest_payment_id)
                  : "—"}
              </TableCell>

              <TableCell className="text-center">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!row.latest_payment_id || !row.latest_payment_date}
                  onClick={() =>
                    imprimirReciboMatricula({
                      numero: receiptNumberForPrint(
                        row.latest_payment_receipt,
                        row.latest_payment_id ?? row.enrollment_id
                      ),
                      fecha: new Date(row.latest_payment_date ?? new Date().toISOString()).toLocaleDateString("es-NI", {
                        timeZone: "America/Managua",
                      }),
                      estudiante: row.student_name ?? "",
                      grado: row.grade_name ?? "",
                      anio: String(year),
                      nivel: row.section_name ?? "",
                      montoCordobas:
                        row.currency === "NIO"
                          ? Number(row.latest_payment_amount || 0).toFixed(2)
                          : "",
                      montoDolares:
                        row.currency === "USD"
                          ? Number(row.latest_payment_amount || 0).toFixed(2)
                          : "",
                      sumaDe: `${row.currency === "USD" ? "$" : "C$"} ${Number(row.latest_payment_amount || 0).toFixed(2)}`,
                      concepto: "Pago de matrícula",
                    })
                  }
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardLayout>
  );
}
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
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
import { Plus, Printer, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MONTHS_ES,
  DEFAULT_EXCHANGE_RATE,
  currencySymbol,
  formatMoney,
  normalizeCurrency,
} from "@/lib/billing";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormField } from "@/components/common/FormField";
import { imprimirReciboOficial } from "@/utils/imprimirReciboMatricula";
import { usePaymentsFlow } from "@/hooks/usePaymentsFlow";
import { canApplyInputChange } from "@/lib/paymentValidation";
import { mapSupabaseErrorToToast } from "@/lib/errorHandling";

type StudentRow = {
  id: string;
  grade_id?: string | null;
  full_name: string;
  grades?: { name?: string | null } | null;
  sections?: { name?: string | null } | null;
};

type MonthlyChargeRow = {
  id: string;
  student_id: string;
  month: number;
  amount: number;
  paid_amount: number;
  currency: "NIO" | "USD";
  status: "PENDIENTE" | "PARCIAL" | "PAGADO";
};

type MonthlyPaymentRow = {
  id: string;
  currency: "NIO" | "USD";
  amount: number;
  received_amount: number;
  change_amount: number;
  month: number;
  paid_at: string;
  description?: string | null;
  method?: string | null;
  students?: {
    full_name?: string | null;
    grades?: { name?: string | null } | null;
    sections?: { name?: string | null } | null;
  } | null;
};

type PaymentFormState = {
  student_id: string;
  charge_id: string;
  recibido: string;
  pay_currency: "NIO" | "USD";
};

/* ================= FETCHERS ================= */

const fetchCurrentAcademicYear = async () => {
  const { data, error } = await supabase
    .from("school_settings")
    .select("current_academic_year")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.current_academic_year ?? new Date().getFullYear();
};

const fetchPayments = async (year: number): Promise<MonthlyPaymentRow[]> => {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id,
      student_id,
      charge_id,
      amount,
      received_amount,
      change_amount,
      currency,
      paid_at,
      concept,
      month,
      description,
      method,
      academic_year,
      students (
        full_name,
        grades ( name ),
        sections ( name )
      )
    `)
    .eq("concept", "MENSUALIDAD")
    .eq("academic_year", year)
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MonthlyPaymentRow[];
};

const fetchStudents = async (): Promise<StudentRow[]> => {
  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      grade_id,
      full_name,
      status,
      grades ( name ),
      sections ( name )
    `)
    .eq("status", "ACTIVO")
    .order("full_name");

  if (error) throw error;
  return (data ?? []) as StudentRow[];
};

const fetchGradePrice = async (gradeId: string) => {
  if (!gradeId) return null;
  const { data, error } = await supabase
    .from("grade_prices")
    .select("monthly_amount, monthly_amount_usd")
    .eq("grade_id", gradeId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const fetchStudentOpenCharges = async (studentId: string, year: number): Promise<MonthlyChargeRow[]> => {
  const { data, error } = await supabase
    .from("charges")
    .select(`
      id,
      student_id,
      month,
      amount,
      paid_amount,
      currency,
      academic_year,
      concept,
      status,
      created_at
    `)
    .eq("student_id", studentId)
    .eq("academic_year", year)
    .eq("concept", "MENSUALIDAD")
    .in("status", ["PENDIENTE", "PARCIAL"])
    .order("month", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MonthlyChargeRow[];
};

/* ================= COMPONENT ================= */

export default function Pagos() {
  const qc = useQueryClient();

  const { data: defaultAcademicYear } = useQuery({
    queryKey: ["academic-year"],
    queryFn: fetchCurrentAcademicYear,
  });

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const [search, setSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [studentCharges, setStudentCharges] = useState<MonthlyChargeRow[]>([]);

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", year],
    queryFn: () => fetchPayments(year),
    enabled: !!year,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-active"],
    queryFn: fetchStudents,
  });

  const [form, setForm] = useState<PaymentFormState>({
    student_id: "",
    charge_id: "",
    recibido: "",
    pay_currency: "USD",
  });

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === form.student_id),
    [students, form.student_id]
  );

  const { data: selectedGradePrice } = useQuery({
    queryKey: ["grade-price", selectedStudent?.grade_id],
    queryFn: () => fetchGradePrice(selectedStudent?.grade_id),
    enabled: !!selectedStudent?.grade_id,
  });

  const dynamicRate = useMemo(() => {
    const nio = Number(selectedGradePrice?.monthly_amount ?? 0);
    const usd = Number(selectedGradePrice?.monthly_amount_usd ?? 0);
    if (nio > 0 && usd > 0) {
      return nio / usd;
    }
    return DEFAULT_EXCHANGE_RATE;
  }, [selectedGradePrice]);

  useEffect(() => {
    if (defaultAcademicYear) {
      setYear(Number(defaultAcademicYear));
    }
  }, [defaultAcademicYear]);

  useEffect(() => {
    if (!form.student_id || form.charge_id || studentCharges.length === 0) return;
    const firstCharge = studentCharges[0];
    setForm((prev) => ({
      ...prev,
      charge_id: firstCharge.id,
      pay_currency: normalizeCurrency(firstCharge.currency),
      recibido: "",
    }));
  }, [form.student_id, form.charge_id, studentCharges]);

  const resetPaymentForm = () => {
    setForm({
      student_id: "",
      charge_id: "",
      recibido: "",
      pay_currency: "USD",
    });
    setSearch("");
    setStudentCharges([]);
  };

  const selectedCharge = studentCharges.find((c) => c.id === form.charge_id);

  const totalOriginal = Number(selectedCharge?.amount ?? 0);
  const paidSoFar = Number(selectedCharge?.paid_amount ?? 0);

  const flow = usePaymentsFlow({
    chargeAmount: totalOriginal,
    chargePaidAmount: paidSoFar,
    chargeCurrency: selectedCharge?.currency,
    payCurrency: form.pay_currency,
    exchangeRate: dynamicRate,
    receivedInput: form.recibido,
  });

  const chargeCurrency = flow.normalizedChargeCurrency;
  const payCurrency = flow.normalizedPayCurrency;
  const recibidoNum = flow.validation.numericValue;
  const isRecibidoFormatValid = flow.validation.isFormatValid;
  const isRecibidoDigitsValid = flow.validation.isDigitsValid;
  const isRecibidoPositive = flow.validation.isPositive;
  const isRecibidoValid = flow.validation.isValid;
  const remainingInPayCurrency = flow.remainingInPayCurrency;
  const amountAppliedInPayCurrency = flow.appliedInPayCurrency;
  const cambio = flow.change;

  const simboloPago = currencySymbol(payCurrency);
  const loadStudentOpenCharges = async (studentId: string) => {
    try {
      const data = await fetchStudentOpenCharges(studentId, year);

      const byMonth = new Map<number, MonthlyChargeRow>();

      for (const charge of data ?? []) {
        if (!charge.month) continue;

        const existing = byMonth.get(charge.month);
        if (!existing) {
          byMonth.set(charge.month, charge);
        } else if (
          existing.status === "PENDIENTE" &&
          charge.status === "PARCIAL"
        ) {
          byMonth.set(charge.month, charge);
        }
      }

      const visibles = Array.from(byMonth.values())
        .filter((c) => {
          const saldo = Number(c.amount || 0) - Number(c.paid_amount || 0);
          return (c.status === "PENDIENTE" || c.status === "PARCIAL") && saldo > 0;
        })
        .sort((a, b) => a.month - b.month);

      setStudentCharges(visibles);
    } catch (error) {
      console.error("Error cargando mensualidades del estudiante:", error);
      toast.error("No se pudieron cargar las mensualidades pendientes.");
      setStudentCharges([]);
    }
  };

  const createPayment = useMutation({
    mutationFn: async () => {
      if (!selectedCharge) throw new Error("NO_CHARGE");
      if (!form.student_id) throw new Error("NO_STUDENT");
      if (!["USD", "NIO"].includes(payCurrency)) throw new Error("MONEDA_INVALIDA");
      if (!isRecibidoFormatValid || !isRecibidoDigitsValid || !isRecibidoPositive) {
        throw new Error("LIMITE_RECIBIDO");
      }

      const paidAt = new Date().toISOString();
      const safeRate = dynamicRate > 0 ? dynamicRate : DEFAULT_EXCHANGE_RATE;

      // Validación fuerte contra BD para evitar duplicados por mes ya pagado.
      const { data: freshCharge, error: freshChargeErr } = await supabase
        .from("charges")
        .select(`
          id,
          student_id,
          month,
          amount,
          paid_amount,
          currency,
          status
        `)
        .eq("id", selectedCharge.id)
        .maybeSingle();

      if (freshChargeErr) throw freshChargeErr;
      if (!freshCharge) throw new Error("CHARGE_NOT_FOUND");

      const freshAmount = Number(freshCharge.amount || 0);
      const freshPaid = Number(freshCharge.paid_amount || 0);
      const freshRemainingInChargeCurrency = Math.max(freshAmount - freshPaid, 0);

      if (freshCharge.status === "PAGADO" || freshRemainingInChargeCurrency <= 0.0001) {
        throw new Error("YA_PAGADO");
      }

      const freshChargeCurrency = freshCharge.currency ?? "USD";

      const freshRemainingInPayCurrency =
        freshChargeCurrency === payCurrency
          ? freshRemainingInChargeCurrency
          : freshChargeCurrency === "USD" && payCurrency === "NIO"
            ? freshRemainingInChargeCurrency * safeRate
            : freshRemainingInChargeCurrency / safeRate;

      const freshAmountAppliedInPayCurrency = Math.min(
        recibidoNum,
        Number(freshRemainingInPayCurrency.toFixed(2))
      );

      if (freshAmountAppliedInPayCurrency <= 0) {
        throw new Error("MONTO_INVALIDO");
      }

      const freshAmountAppliedInChargeCurrency =
        freshChargeCurrency === payCurrency
          ? freshAmountAppliedInPayCurrency
          : freshChargeCurrency === "USD" && payCurrency === "NIO"
            ? freshAmountAppliedInPayCurrency / safeRate
            : freshAmountAppliedInPayCurrency * safeRate;

      const newPaidAmount = freshPaid + freshAmountAppliedInChargeCurrency;

      const newStatus =
        newPaidAmount + 0.0001 >= freshAmount
          ? "PAGADO"
          : "PARCIAL";

      const freshCambio =
        recibidoNum > freshAmountAppliedInPayCurrency
          ? recibidoNum - freshAmountAppliedInPayCurrency
          : 0;

      const { error: payErr } = await supabase.from("payments").insert({
        student_id: freshCharge.student_id,
        charge_id: freshCharge.id,
        concept: "MENSUALIDAD",
        academic_year: year,
        month: freshCharge.month,
        amount: Number(freshAmountAppliedInPayCurrency.toFixed(2)),
        received_amount: Number(recibidoNum.toFixed(2)),
        change_amount: Number(freshCambio.toFixed(2)),
        currency: payCurrency,
        method: payCurrency === "USD" ? "DOLAR" : "EFECTIVO",
        paid_at: paidAt,
        status: "COMPLETADO",
        description: newStatus,
      });

      if (payErr) throw payErr;

      const { error: chargeErr } = await supabase
        .from("charges")
        .update({
          paid_amount: Number(newPaidAmount.toFixed(2)),
          status: newStatus,
        })
        .eq("id", freshCharge.id);

      if (chargeErr) throw chargeErr;

      return {
        paidAt,
        chargeMonth: freshCharge.month,
        totalInPayCurrency: Number(freshRemainingInPayCurrency.toFixed(2)),
        appliedInPayCurrency: Number(freshAmountAppliedInPayCurrency.toFixed(2)),
        cambio: Number(freshCambio.toFixed(2)),
      };
    },

    onSuccess: async ({ paidAt, chargeMonth, appliedInPayCurrency }) => {
      await qc.invalidateQueries({ queryKey: ["payments", year] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });

      if (selectedCharge?.student_id) {
        await loadStudentOpenCharges(selectedCharge.student_id);
      }

      setOpen(false);

      imprimirReciboOficial({
        numero: String(Date.now()).slice(-5),
        estudiante: search,
        grado: selectedStudent?.grades?.name ?? "",
        anio: String(year),
        nivel: selectedStudent?.sections?.name ?? "",
        montoCordobas: payCurrency === "NIO" ? Number(recibidoNum || 0).toFixed(2) : "",
        montoDolares: payCurrency === "USD" ? Number(recibidoNum || 0).toFixed(2) : "",
        sumaDe: `${simboloPago} ${Number(appliedInPayCurrency || 0).toFixed(2)}`,
        concepto: `Mensualidad ${MONTHS_ES[(chargeMonth ?? 1) - 1]}`,
        fecha: new Date(paidAt).toLocaleString("es-NI", {
          timeZone: "America/Managua",
        }),
      });

      resetPaymentForm();
      toast.success("Pago registrado correctamente.");
    },

    onError: (err: unknown) => {
      console.error("Error registrando pago:", err);
      const message = mapSupabaseErrorToToast(err, {
        currency: payCurrency,
        fallback: "No se pudo registrar el pago.",
        customMap: {
          MONTO_INVALIDO: "El monto recibido no es válido.",
          YA_PAGADO: "Esta mensualidad ya está pagada y no se puede cobrar de nuevo.",
          NO_STUDENT: "Debes seleccionar un estudiante.",
          MONEDA_INVALIDA: "Moneda de pago inválida.",
        },
      });

      if (message.includes("monto recibido")) {
        toast.error("El monto recibido no es válido.");
        return;
      }
      toast.error(message);
    },
  });

  const filtered = payments.filter((p) => {
    const text = `${p.students?.full_name ?? ""} ${p.students?.grades?.name ?? ""} ${p.students?.sections?.name ?? ""} ${p.description ?? ""} ${p.method ?? ""} ${MONTHS_ES[(p.month ?? 1) - 1] ?? ""}`
      .toLowerCase();

    return text.includes(tableSearch.toLowerCase());
  });

  const searchInDialog = search.toLowerCase().trim();
  const filteredStudents = students.filter((s) => {
    const text = `${s.full_name ?? ""} ${s.grades?.name ?? ""} ${s.sections?.name ?? ""}`
      .toLowerCase();
    return text.includes(searchInDialog);
  });

  const yearBase = Number(defaultAcademicYear ?? currentYear);
  const yearOptions = Array.from({ length: 8 }).map((_, i) => yearBase - i);

  return (
    <DashboardLayout
      title="Mensualidades"
      subtitle="Control de pagos mensuales"
    >
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <div className="flex-1">
          <label className="text-sm font-medium block mb-1">Buscar</label>
          <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            placeholder="Buscar pagos registrados..."
            value={tableSearch}
            className="pl-9"
            onChange={(e) => setTableSearch(e.target.value)}
          />
          </div>
        </div>

        <div className="w-full md:w-40">
          <label className="text-sm font-medium block mb-1">Año</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              resetPaymentForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="h-10">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Mensualidad
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pago de Mensualidad</DialogTitle>
              <DialogDescription>
                Elige estudiante, mes, moneda y registra el pago.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* BÚSQUEDA ESTUDIANTE */}
              <div>
                <label className="text-sm font-semibold block mb-2">
                  Estudiante
                </label>
                <label className="text-sm font-medium block mb-2">
                  Buscar por nombre
                </label>
                <Input
                  placeholder="Buscar estudiante..."
                  value={search}
                  className="h-10 text-sm"
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
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={async () => {
                            setForm({
                              student_id: s.id,
                              charge_id: "",
                              recibido: "",
                              pay_currency: "USD",
                            });
                            setSearch(s.full_name);
                            await loadStudentOpenCharges(s.id);
                          }}
                        >
                          <p className="font-medium text-sm">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.grades?.name ?? "Sin grado"} {s.sections?.name ?? ""}
                          </p>
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
                      onClick={resetPaymentForm}
                    >
                      Cambiar
                    </Button>
                  </div>
                )}
              </div>

              {/* CARGO */}
              {form.student_id && (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Mes pendiente
                    </label>

                    {studentCharges.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Este estudiante no tiene mensualidades pendientes o parciales.
                      </p>
                    ) : (
                      <select
                        className="w-full border rounded px-3 py-2 h-10 text-sm"
                        value={form.charge_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            charge_id: e.target.value,
                            recibido: "",
                          })
                        }
                      >
                        <option value="">Seleccionar mensualidad</option>
                        {studentCharges.map((c) => {
                          const saldoMes = Number(c.amount || 0) - Number(c.paid_amount || 0);
                          return (
                            <option key={c.id} value={c.id}>
                              {MONTHS_ES[c.month - 1]} - {c.status} - {formatMoney(saldoMes, c.currency)}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  {/* RESUMEN */}
                  {selectedCharge && (
                    <>
                      <div className="grid grid-cols-2 gap-3 rounded-md border p-3 bg-muted/20">
                        <div>
                          <p className="text-xs text-muted-foreground">Total del cargo</p>
                          <p className="font-semibold text-sm">
                            {formatMoney(totalOriginal, chargeCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Abonado</p>
                          <p className="font-semibold text-sm">
                            {formatMoney(paidSoFar, chargeCurrency)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                          <p className="font-semibold text-sm">
                            {formatMoney(remainingInPayCurrency, payCurrency)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium block mb-2">
                            Moneda de pago
                          </label>
                          <select
                            className="w-full border rounded px-3 py-2 h-10 text-sm"
                            value={form.pay_currency}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                pay_currency: e.target.value,
                                recibido: "",
                              })
                            }
                          >
                            <option value="USD">Dólares ($)</option>
                            <option value="NIO">Córdobas (C$)</option>
                          </select>
                        </div>

                        <FormField
                          label="Recibido"
                          hint={`Máximo ${payCurrency === "USD" ? "3" : "4"} cifras (${payCurrency === "USD" ? "999.99" : "9999.99"}).`}
                        >
                          <Input
                            inputMode="decimal"
                            pattern="^[0-9]*([.,][0-9]{0,2})?$"
                            className="h-10 text-sm"
                            value={String(form.recibido ?? "")}
                            onChange={(e) => {
                              const raw = e.target.value.replace(",", ".");
                              if (!canApplyInputChange(raw, payCurrency)) return;
                              setForm({ ...form, recibido: raw });
                            }}
                          />
                        </FormField>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 text-xs"
                          onClick={() =>
                            setForm({
                              ...form,
                              recibido: Number(remainingInPayCurrency.toFixed(2)).toString(),
                            })
                          }
                        >
                          Cobrar exacto
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 text-xs"
                          onClick={() =>
                            setForm({
                              ...form,
                              recibido: Number((remainingInPayCurrency / 2).toFixed(2)).toString(),
                            })
                          }
                        >
                          Cobrar mitad
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 text-xs"
                          onClick={() => setForm({ ...form, recibido: "" })}
                        >
                          Limpiar
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium block mb-2">
                            Monto aplicado en este pago
                          </label>
                          <Input
                            disabled
                            className="h-10 text-sm"
                            value={formatMoney(amountAppliedInPayCurrency, payCurrency)}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-2">
                            Cambio
                          </label>
                          <Input
                            disabled
                            className="h-10 text-sm"
                            value={formatMoney(cambio, payCurrency)}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border p-3 bg-amber-50 text-sm">
                        Se aceptan pagos parciales. Si el monto recibido es menor al saldo, la mensualidad quedará en <strong>PARCIAL</strong>.
                      </div>

                      <Button
                        className="w-full h-10 text-sm font-semibold"
                        disabled={
                          !form.charge_id ||
                          !isRecibidoValid ||
                          createPayment.isPending
                        }
                        onClick={() => createPayment.mutate()}
                      >
                        {createPayment.isPending ? "Registrando..." : "Registrar Pago"}
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLA */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estudiante</TableHead>
            <TableHead>Mes</TableHead>
            <TableHead>Monto aplicado</TableHead>
            <TableHead>Recibido</TableHead>
            <TableHead>Cambio</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Estado pago</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Acción</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No hay pagos registrados para este filtro.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((p) => {
            const simbolo = currencySymbol(p.currency);

            return (
              <TableRow key={p.id}>
                <TableCell>{p.students?.full_name}</TableCell>
                <TableCell>{MONTHS_ES[p.month - 1] ?? p.month}</TableCell>
                <TableCell>
                  {formatMoney(Number(p.amount || 0), p.currency)}
                </TableCell>
                <TableCell>
                  {formatMoney(Number(p.received_amount || 0), p.currency)}
                </TableCell>
                <TableCell>
                  {formatMoney(Number(p.change_amount || 0), p.currency)}
                </TableCell>
                <TableCell>
                  {p.currency === "USD" ? "Dólares" : "Córdobas"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={p.description ?? "COMPLETADO"} />
                </TableCell>
                <TableCell>
                  {new Date(p.paid_at).toLocaleString("es-NI", {
                    timeZone: "America/Managua",
                  })}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      imprimirReciboOficial({
                        numero: String(p.id).slice(-5),
                        estudiante: p.students?.full_name,
                        grado: p.students?.grades?.name ?? "",
                        anio: String(year),
                        nivel: p.students?.sections?.name ?? "",
                        montoCordobas: p.currency === "NIO" ? Number(p.received_amount || 0).toFixed(2) : "",
                        montoDolares: p.currency === "USD" ? Number(p.received_amount || 0).toFixed(2) : "",
                        sumaDe: `${simbolo} ${Number(p.amount || 0).toFixed(2)}`,
                        concepto: `Mensualidad ${MONTHS_ES[p.month - 1] ?? p.month}`,
                        fecha: new Date(p.paid_at).toLocaleString("es-NI", {
                          timeZone: "America/Managua",
                        }),
                      })
                    }
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DashboardLayout>
  );
}
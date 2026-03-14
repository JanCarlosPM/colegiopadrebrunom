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

/* ================= RECIBO ================= */

function imprimirRecibo(data: any) {
  const win = window.open("", "", "width=800,height=600");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>Recibo Mensualidad</title>
        <style>
          body { font-family: Arial; font-size: 12px; padding: 20px; }
          h2 { text-align: center; }
          hr { margin: 10px 0; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <h2>Colegio Padre Bruno Martínez</h2>
        <p><strong>Fecha:</strong> ${data.fecha}</p>
        <p><strong>Estudiante:</strong> ${data.estudiante}</p>
        <hr />
        <p><strong>Concepto:</strong> Mensualidad</p>
        <p><strong>Mes:</strong> ${data.mes}</p>
        <p><strong>Total:</strong> ${data.moneda} ${data.total}</p>
        <p><strong>Aplicado:</strong> ${data.moneda} ${data.aplicado}</p>
        <p><strong>Recibido:</strong> ${data.moneda} ${data.recibido}</p>
        <p><strong>Cambio:</strong> ${data.moneda} ${data.cambio}</p>
        <hr />
        ___________________________<br/>Firma
      </body>
    </html>
  `);

  win.document.close();
}

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

const fetchPayments = async (year: number) => {
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
  return data ?? [];
};

const fetchStudents = async () => {
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
  return data ?? [];
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

const fetchStudentOpenCharges = async (studentId: string, year: number) => {
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
  return data ?? [];
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
  const [studentCharges, setStudentCharges] = useState<any[]>([]);

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", year],
    queryFn: () => fetchPayments(year),
    enabled: !!year,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-active"],
    queryFn: fetchStudents,
  });

  const [form, setForm] = useState<any>({
    student_id: "",
    charge_id: "",
    recibido: "",
    pay_currency: "USD",
  });

  const selectedStudent = useMemo(
    () => students.find((s: any) => s.id === form.student_id),
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

  const selectedCharge = studentCharges.find(
    (c: any) => c.id === form.charge_id
  );

  const totalOriginal = Number(selectedCharge?.amount ?? 0);
  const paidSoFar = Number(selectedCharge?.paid_amount ?? 0);
  const remainingInChargeCurrency = Math.max(totalOriginal - paidSoFar, 0);

  const chargeCurrency = normalizeCurrency(selectedCharge?.currency ?? "USD");
  const payCurrency = normalizeCurrency(form.pay_currency ?? "USD");
  const maxIntegerDigits = payCurrency === "USD" ? 3 : 4;
  const recibidoRaw = String(form.recibido ?? "").trim();
  const recibidoNormalized = recibidoRaw.replace(",", ".");
  const [recibidoIntPart = ""] = recibidoNormalized.split(".");
  const recibidoNum = Number(recibidoNormalized || 0);
  const isRecibidoFormatValid = /^\d*\.?\d{0,2}$/.test(recibidoNormalized);
  const isRecibidoDigitsValid = recibidoIntPart.length <= maxIntegerDigits;
  const isRecibidoPositive = recibidoNum > 0;
  const isRecibidoValid =
    recibidoNormalized.length > 0 &&
    isRecibidoFormatValid &&
    isRecibidoDigitsValid &&
    isRecibidoPositive;

  const remainingInPayCurrency =
    chargeCurrency === payCurrency
      ? remainingInChargeCurrency
      : chargeCurrency === "USD" && payCurrency === "NIO"
        ? remainingInChargeCurrency * dynamicRate
        : remainingInChargeCurrency / dynamicRate;

  const amountAppliedInPayCurrency = Math.min(
    recibidoNum,
    Number(remainingInPayCurrency.toFixed(2))
  );

  const amountAppliedInChargeCurrency =
    chargeCurrency === payCurrency
      ? amountAppliedInPayCurrency
      : chargeCurrency === "USD" && payCurrency === "NIO"
        ? amountAppliedInPayCurrency / dynamicRate
        : amountAppliedInPayCurrency * dynamicRate;

  const cambio =
    recibidoNum > amountAppliedInPayCurrency
      ? recibidoNum - amountAppliedInPayCurrency
      : 0;

  const simboloPago = currencySymbol(payCurrency);
  const loadStudentOpenCharges = async (studentId: string) => {
    try {
      const data = await fetchStudentOpenCharges(studentId, year);

      const byMonth = new Map<number, any>();

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
        .filter((c: any) => {
          const saldo = Number(c.amount || 0) - Number(c.paid_amount || 0);
          return (c.status === "PENDIENTE" || c.status === "PARCIAL") && saldo > 0;
        })
        .sort((a: any, b: any) => a.month - b.month);

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

    onSuccess: async ({ paidAt, chargeMonth, totalInPayCurrency, appliedInPayCurrency, cambio }) => {
      await qc.invalidateQueries({ queryKey: ["payments", year] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });

      if (selectedCharge?.student_id) {
        await loadStudentOpenCharges(selectedCharge.student_id);
      }

      setOpen(false);

      imprimirRecibo({
        estudiante: search,
        mes: MONTHS_ES[(chargeMonth ?? 1) - 1],
        total: Number(totalInPayCurrency || 0).toFixed(2),
        aplicado: Number(appliedInPayCurrency || 0).toFixed(2),
        recibido: recibidoNum.toFixed(2),
        cambio: Number(cambio || 0).toFixed(2),
        moneda: simboloPago,
        fecha: new Date(paidAt).toLocaleString("es-NI", {
          timeZone: "America/Managua",
        }),
      });

      resetPaymentForm();
      toast.success("Pago registrado correctamente.");
    },

    onError: (err: any) => {
      console.error("Error registrando pago:", err);

      if (err.message === "MONTO_INVALIDO") {
        toast.error("El monto recibido no es válido.");
        return;
      }
      if (err.message === "LIMITE_RECIBIDO") {
        toast.error(
          payCurrency === "USD"
            ? "En USD, el campo Recibido acepta máximo 3 cifras (hasta 999.99)."
            : "En C$, el campo Recibido acepta máximo 4 cifras (hasta 9999.99)."
        );
        return;
      }
      if (err.message === "YA_PAGADO") {
        toast.error("Esta mensualidad ya está pagada y no se puede cobrar de nuevo.");
        return;
      }
      if (err.message === "NO_STUDENT") {
        toast.error("Debes seleccionar un estudiante.");
        return;
      }
      if (err.message === "MONEDA_INVALIDA") {
        toast.error("Moneda de pago inválida.");
        return;
      }

      toast.error("No se pudo registrar el pago.");
    },
  });

  const filtered = payments.filter((p: any) => {
    const text = `${p.students?.full_name ?? ""} ${p.students?.grades?.name ?? ""} ${p.students?.sections?.name ?? ""} ${p.description ?? ""} ${p.method ?? ""} ${MONTHS_ES[(p.month ?? 1) - 1] ?? ""}`
      .toLowerCase();

    return text.includes(tableSearch.toLowerCase());
  });

  const searchInDialog = search.toLowerCase().trim();
  const filteredStudents = students.filter((s: any) => {
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
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            placeholder="Buscar pagos registrados..."
            value={tableSearch}
            className="pl-9"
            onChange={(e) => setTableSearch(e.target.value)}
          />
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
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Mensualidad
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Pago de Mensualidad</DialogTitle>
              <DialogDescription>
                Registra pagos completos o parciales con validación de moneda y saldo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              {/* BÚSQUEDA ESTUDIANTE */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  Estudiante
                </label>
                <Input
                  placeholder="Buscar estudiante..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                {search && (
                  <div className="border rounded max-h-40 overflow-y-auto mt-2">
                    {filteredStudents.map((s: any) => (
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
                          <p className="font-medium">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.grades?.name ?? "Sin grado"} {s.sections?.name ?? ""}
                          </p>
                        </div>
                      ))}
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
                        className="w-full border rounded px-3 py-2"
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
                        {studentCharges.map((c: any) => {
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border p-4 bg-muted/20">
                        <div>
                          <p className="text-xs text-muted-foreground">Total del cargo</p>
                          <p className="font-semibold">
                            {formatMoney(totalOriginal, chargeCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Abonado</p>
                          <p className="font-semibold">
                            {formatMoney(paidSoFar, chargeCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                          <p className="font-semibold">
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
                            className="w-full border rounded px-3 py-2"
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
                            value={String(form.recibido ?? "")}
                            onChange={(e) => {
                              const raw = e.target.value.replace(",", ".");
                              if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
                              const [intPart = ""] = raw.split(".");
                              const maxDigits = payCurrency === "USD" ? 3 : 4;
                              if (intPart.length > maxDigits) return;
                              setForm({ ...form, recibido: raw });
                            }}
                          />
                        </FormField>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium block mb-2">
                            Monto aplicado en este pago
                          </label>
                          <Input
                            disabled
                            value={formatMoney(amountAppliedInPayCurrency, payCurrency)}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-2">
                            Cambio
                          </label>
                          <Input
                            disabled
                            value={formatMoney(cambio, payCurrency)}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border p-3 bg-amber-50 text-sm">
                        Se aceptan pagos parciales. Si el monto recibido es menor al saldo, la mensualidad quedará en <strong>PARCIAL</strong>.
                      </div>

                      <Button
                        className="w-full"
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
          {filtered.map((p: any) => {
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
                      imprimirRecibo({
                        estudiante: p.students?.full_name,
                        mes: MONTHS_ES[p.month - 1] ?? p.month,
                        total: Number(p.amount || 0).toFixed(2),
                        aplicado: Number(p.amount || 0).toFixed(2),
                        recibido: Number(p.received_amount || 0).toFixed(2),
                        cambio: Number(p.change_amount || 0).toFixed(2),
                        moneda: simbolo,
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
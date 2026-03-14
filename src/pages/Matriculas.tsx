import { useState, useMemo } from "react";
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
import { imprimirReciboMatricula } from "@/utils/imprimirReciboMatricula";

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
    enrollments: enrollments ?? [],
    students: students ?? [],
    payments: payments ?? [],
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
        const currency = String(data.currency ?? "NIO");
        const rate = 36.67;
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

  const enrollments = data?.enrollments ?? [];
  const students = data?.students ?? [];
  const payments = data?.payments ?? [];

  /* ================= STATE ================= */

  const [openAdd, setOpenAdd] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [currency, setCurrency] = useState<"NIO" | "USD">("NIO");
  const [total, setTotal] = useState(300);
  const [paid, setPaid] = useState(0);
  const [tableSearch, setTableSearch] = useState("");

  const cambio = Math.max(paid - saldoPendiente, 0);

  const filteredStudents = useMemo(() => {
    if (!search) return [];
    return students.filter((s: any) =>
      `${s.full_name} ${s.grades?.name ?? ""} ${s.sections?.name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [students, search]);

  const filteredPayments = useMemo(() => {
    if (!tableSearch) return payments;

    return payments.filter((p: any) => {
      const searchValue = tableSearch.toLowerCase();

      const fecha = new Date(p.paid_at).toLocaleString("es-NI", {
        timeZone: "America/Managua",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).toLowerCase();

      return (
        p.students?.full_name?.toLowerCase().includes(searchValue) ||
        p.students?.grades?.name?.toLowerCase().includes(searchValue) ||
        p.students?.sections?.name?.toLowerCase().includes(searchValue) ||
        String(p.amount).includes(searchValue) ||
        String(p.received_amount).includes(searchValue) ||
        String(p.change_amount).includes(searchValue) ||
        String(p.currency).toLowerCase().includes(searchValue) ||
        String(p.description ?? "").toLowerCase().includes(searchValue) ||
        fecha.includes(searchValue)
      );
    });
  }, [payments, tableSearch]);

  /* ================= MUTATION ================= */

  const createEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error("NO_STUDENT");

      const now = new Date().toISOString();

      const { data: existing, error: existingError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .eq("academic_year", year)
        .maybeSingle();

      if (existingError) throw existingError;

      let montoAplicado = 0;
      let cambioPago = 0;
      let statusPago = "PENDIENTE";

      const ensureMonthlyCharges = async () => {
        const gradeId = selectedStudent?.grade_id;
        if (!gradeId) return;

        const { data: priceRow } = await supabase
          .from("grade_prices")
          .select("*")
          .eq("grade_id", gradeId)
          .maybeSingle();

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

        const existingMonths = new Set(
          (existingCharges ?? [])
            .map((c: any) => Number(c.month))
            .filter((m: number) => m >= 1 && m <= 12)
        );

        const missingMonths = Array.from({ length: 12 }, (_, i) => i + 1).filter(
          (m) => !existingMonths.has(m)
        );

        if (missingMonths.length === 0) return;

        const rows = missingMonths.map((month) => ({
          student_id: selectedStudent.id,
          academic_year: year,
          grade_id: gradeId,
          concept: "MENSUALIDAD",
          month,
          due_date: `${year}-${String(month).padStart(2, "0")}-10`,
          amount: monthlyAmount,
          currency: chargeCurrency,
          status: "PENDIENTE",
          paid_amount: 0,
        }));

        const { error: insertChargesError } = await supabase
          .from("charges")
          .insert(rows);

        if (insertChargesError) throw insertChargesError;
      };

      if (!existing) {
        const totalOriginal = Number(total);
        montoAplicado = Math.min(paid, totalOriginal);
        cambioPago = Math.max(paid - montoAplicado, 0);

        statusPago = montoAplicado < totalOriginal ? "PARCIAL" : "PAGADO";

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

        montoAplicado = Math.min(paid, restante);
        cambioPago = Math.max(paid - montoAplicado, 0);

        if (montoAplicado <= 0) {
          throw new Error("YA_PAGADO");
        }

        const newPaid = alreadyPaid + montoAplicado;
        statusPago = newPaid < totalOriginal ? "PARCIAL" : "PAGADO";

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

      const { error: paymentError } = await supabase.from("payments").insert({
        student_id: selectedStudent.id,
        concept: "MATRICULA",
        amount: montoAplicado,
        received_amount: paid,
        change_amount: cambioPago,
        currency,
        academic_year: year,
        paid_at: now,
        description: statusPago,
        method: currency === "USD" ? "DOLAR" : "EFECTIVO",
      });

      if (paymentError) throw paymentError;

      return {
        paidAt: now,
        montoAplicado,
        cambioPago,
        statusPago,
      };
    },

    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ["matriculas", year] });

      setOpenAdd(false);

      setTimeout(() => {
        imprimirReciboMatricula({
          numero: String(Date.now()).slice(-5),
          fecha: new Date(result.paidAt).toLocaleDateString("es-NI", {
            timeZone: "America/Managua",
          }),
          estudiante: selectedStudent.full_name,
          grado: selectedStudent.grades?.name ?? "",
          anio: String(year),
          nivel: selectedStudent.sections?.name ?? "",
          montoCordobas:
            currency === "NIO" ? Number(paid).toFixed(2) : "",
          montoDolares:
            currency === "USD" ? Number(paid).toFixed(2) : "",
          concepto: "Pago de matrícula",
        });
      }, 300);

      setPaid(0);
      setSearch("");
      setSelectedStudent(null);
      setSaldoPendiente(0);
      setTotal(300);
      setCurrency("NIO");
    },

    onError: (err: any) => {
      if (err.message === "YA_PAGADO") {
        setInfoMsg("Esta matrícula ya está completamente pagada.");
      } else {
        const detailed =
          err?.message ||
          err?.details ||
          err?.hint ||
          "Error al registrar matrícula.";
        setInfoMsg(detailed);
      }
      setOpenInfo(true);
    },
  });

  /* ================= UI ================= */

  return (
    <DashboardLayout title="Matrículas" subtitle="Pago de matrícula">
      <div className="flex justify-end mb-6">
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Matrícula
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Pago de Matrícula</DialogTitle>
              <DialogDescription>
                Selecciona estudiante, monto recibido y moneda para registrar su matrícula.
              </DialogDescription>
            </DialogHeader>

            {/* ESTUDIANTE */}
            <label className="text-sm font-medium">Estudiante</label>
            <Input
              placeholder="Buscar estudiante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <div className="border rounded max-h-40 overflow-y-auto">
                {filteredStudents.map((s: any) => (
                  <div
                    key={s.id}
                    className="p-2 hover:bg-muted cursor-pointer flex gap-2"
                    onClick={async () => {
                      const { data: existing } = await supabase
                        .from("enrollments")
                        .select("*")
                        .eq("student_id", s.id)
                        .eq("academic_year", year)
                        .maybeSingle();

                      if (existing) {
                        const totalOriginal = Number(existing.total_amount);
                        const alreadyPaid = Number(existing.paid_amount);
                        const restante = totalOriginal - alreadyPaid;

                        setTotal(totalOriginal);
                        setSaldoPendiente(Math.max(restante, 0));
                        setCurrency(existing.currency);
                      } else {
                        const base =
                          currency === "USD"
                            ? (matriculaSettings?.matriculaUsd ?? 8)
                            : (matriculaSettings?.matriculaNio ?? 300);
                        setTotal(base);
                        setSaldoPendiente(base);
                      }

                      setPaid(0);
                      setSelectedStudent(s);
                      setSearch(s.full_name);
                    }}
                  >
                    <User className="h-4 w-4 mt-1" />
                    <div>
                      <p className="font-medium">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.grades?.name}{" "}
                        {s.sections?.name ? `- ${s.sections?.name}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!selectedStudent && (
              <p className="text-xs text-red-500 mt-1">
                Debe seleccionar un estudiante
              </p>
            )}

            {/* TOTAL + MONEDA */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Total matrícula</label>
                <Input type="number" value={saldoPendiente} disabled />
              </div>

              <div>
                <label className="text-sm font-medium">Moneda</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={currency}
                  onChange={(e) => {
                    const v = e.target.value as "NIO" | "USD";
                    setCurrency(v);

                    if (selectedStudent) {
                      const enrollment = enrollments.find(
                        (en: any) => en.student_id === selectedStudent.id
                      );

                      if (enrollment) {
                        const restante =
                          Number(enrollment.total_amount) -
                          Number(enrollment.paid_amount);

                        const tasa = 36;
                        const convertido =
                          v === "USD" ? restante / tasa : restante * tasa;

                        setSaldoPendiente(Math.max(convertido, 0));
                      }
                    }

                    setPaid(0);
                  }}
                >
                  <option value="NIO">Córdobas (C$)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
            </div>

            {/* RECIBIDO + CAMBIO */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Recibido</label>
                <Input
                  type="text"
                  value={paid || ""}
                  maxLength={currency === "USD" ? 3 : 4}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    const limited =
                      currency === "USD"
                        ? value.slice(0, 3)
                        : value.slice(0, 4);

                    setPaid(Number(limited));
                  }}
                />
                {!paid && (
                  <p className="text-xs text-red-500 mt-1">
                    Campo obligatorio
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Cambio</label>
                <Input
                  disabled
                  value={
                    cambio > 0
                      ? `${currency === "USD" ? "$" : "C$"} ${cambio}`
                      : `${currency === "USD" ? "$" : "C$"} 0`
                  }
                />
              </div>
            </div>

            {/* BOTÓN */}
            <Button
              className="w-full mt-6"
              disabled={!selectedStudent || paid <= 0 || saldoPendiente === 0}
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
            placeholder="Estudiante, grado, sección, recibido, cambio, estado o fecha..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA DE PAGOS DE MATRÍCULA */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estudiante</TableHead>
            <TableHead>Grado</TableHead>
            <TableHead>Sección</TableHead>
            <TableHead>Monto Aplicado</TableHead>
            <TableHead>Recibido</TableHead>
            <TableHead>Cambio</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha y Hora</TableHead>
            <TableHead className="text-center">Acción</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredPayments.map((p: any) => (
            <TableRow key={p.id}>
              <TableCell>{p.students?.full_name}</TableCell>

              <TableCell>{p.students?.grades?.name ?? "-"}</TableCell>

              <TableCell>{p.students?.sections?.name ?? "-"}</TableCell>

              <TableCell>
                {p.currency === "USD" ? "$" : "C$"} {Number(p.amount).toFixed(2)}
              </TableCell>

              <TableCell>
                {p.currency === "USD" ? "$" : "C$"} {Number(p.received_amount || 0).toFixed(2)}
              </TableCell>

              <TableCell>
                {p.currency === "USD" ? "$" : "C$"} {Number(p.change_amount || 0).toFixed(2)}
              </TableCell>

              <TableCell>{p.currency === "USD" ? "Dólares" : "Córdobas"}</TableCell>

              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    p.description === "PAGADO"
                      ? "bg-green-100 text-green-700"
                      : p.description === "PARCIAL"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {p.description ?? "—"}
                </span>
              </TableCell>

              <TableCell>
                {new Date(p.paid_at).toLocaleString("es-NI", {
                  timeZone: "America/Managua",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>

              <TableCell className="text-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    imprimirReciboMatricula({
                      numero: String(p.id).slice(-5),
                      fecha: new Date(p.paid_at).toLocaleDateString("es-NI", {
                        timeZone: "America/Managua",
                      }),
                      estudiante: p.students?.full_name ?? "",
                      grado: p.students?.grades?.name ?? "",
                      anio: String(year),
                      nivel: p.students?.sections?.name ?? "",
                      montoCordobas:
                        p.currency === "NIO"
                          ? Number(p.received_amount || 0).toFixed(2)
                          : "",
                      montoDolares:
                        p.currency === "USD"
                          ? Number(p.received_amount || 0).toFixed(2)
                          : "",
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
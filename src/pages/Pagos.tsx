import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

const fetchPayments = async () => {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      currency,
      paid_at,
      concept,
      month,
      students (
        full_name,
        grades ( name ),
        sections ( name )
      )
    `)
    .eq("concept", "MENSUALIDAD") // ✅ CORREGIDO
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
};
const fetchStudents = async () => {
  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      full_name,
      grades ( name ),
      sections ( name )
    `)
    .order("full_name");

  if (error) throw error;
  return data ?? [];
};
const fetchPendingCharges = async (currentYear: number) => {
  const { data, error } = await supabase
    .from("charges")
    .select(`
      id,
      student_id,
      month,
      amount,
      currency,
      academic_year,
      concept,
      status
    `)
    .eq("academic_year", currentYear)
    .eq("concept", "MENSUALIDAD")
    .eq("status", "PENDIENTE")
    .order("month");

  if (error) throw error;
  return data ?? [];
};
/* ================= COMPONENT ================= */

export default function Pagos() {

  const qc = useQueryClient();

  const { data: academicYear } = useQuery({
    queryKey: ["academic-year"],
    queryFn: fetchCurrentAcademicYear,
  });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
  });

  const {
    data: charges = [],
    error: chargesError,
    isError: chargesIsError,
    isLoading: chargesLoading,
  } = useQuery({
    queryKey: ["charges-pending", academicYear],
    enabled: !!academicYear,
    queryFn: () => fetchPendingCharges(academicYear!),
  });

  useEffect(() => {
    if (chargesIsError) console.error("ERROR charges:", chargesError);
    console.log("academicYear:", academicYear, "charges:", charges.length, charges.slice(0, 3));
  }, [chargesIsError, chargesError, charges, academicYear]);



  const [form, setForm] = useState<any>({
    student_id: "",
    charge_id: "",
    recibido: "",
    pay_currency: "USD", // o "NIO"
  });

  const selectedCharge = charges.find(
    (c: any) => c.id === form.charge_id
  );

  const RATE_USD_TO_NIO = 36.5;

  const total = selectedCharge?.amount ?? 0;
  const chargeCurrency = selectedCharge?.currency ?? "USD"; // moneda del cargo
  const payCurrency = form.pay_currency ?? "USD";

  const recibidoNum = Number(form.recibido || 0);

  // convertir total a moneda de pago
  const totalInPayCurrency =
    chargeCurrency === payCurrency
      ? total
      : chargeCurrency === "USD" && payCurrency === "NIO"
        ? total * RATE_USD_TO_NIO
        : total / RATE_USD_TO_NIO;


  const simboloPago = payCurrency === "USD" ? "$" : "C$";

  useEffect(() => {
    if (!academicYear) return;

    const generarMensualidades = async () => {
      const { data: enrollments, error } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("academic_year", academicYear);

      if (error || !enrollments) return;

      for (const e of enrollments) {
        for (let mes = 1; mes <= currentMonth; mes++) {
          const { data: existing } = await supabase
            .from("charges")
            .select("id")
            .eq("student_id", e.student_id)
            .eq("academic_year", academicYear)
            .eq("concept", "MENSUALIDAD")
            .eq("month", mes)
            .maybeSingle();

          if (!existing) {
            await supabase.from("charges").insert({
              student_id: e.student_id,
              academic_year: academicYear,
              concept: "MENSUALIDAD",
              month: mes,
              amount: 21,          // ✅ monto base
              currency: "USD",     // ✅ moneda base
              status: "PENDIENTE",
            });
          }
        }
      }

      qc.invalidateQueries({ queryKey: ["charges-pending"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    };

    generarMensualidades();
  }, [academicYear, currentMonth, qc]);

  const cambio =
    form.recibido > total ? form.recibido - total : 0;


  /* ================= CREATE PAYMENT ================= */

  const createPayment = useMutation({
    mutationFn: async () => {
      if (!selectedCharge) throw new Error("No charge");

      const paidAt = new Date().toISOString();
      const payCurrency = form.pay_currency ?? "USD";

      await supabase.from("payments").insert({
        student_id: selectedCharge.student_id,
        charge_id: selectedCharge.id,
        concept: "MENSUALIDAD",
        month: selectedCharge.month,
        amount: totalInPayCurrency,   // ✅ en moneda de pago
        currency: payCurrency,        // ✅ USD o NIO
        method: "EFECTIVO",
        paid_at: paidAt,
      });
     

      // 2) Update charge status
      const { error: chErr } = await supabase
        .from("charges")
        .update({ status: "PAGADO" })
        .eq("id", selectedCharge.id);
      if (chErr) throw chErr;

      return paidAt;
    },

    onSuccess: (paidAt) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["charges-pending"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });

      setOpen(false);

      imprimirRecibo({
        estudiante: search,
        mes: selectedCharge.month,
        total,
        recibido: form.recibido,
        cambio,
        moneda: simbolo,
        fecha: new Date(paidAt).toLocaleString("es-NI", {
          timeZone: "America/Managua",
        }),
      });

      // ✅ REINICIAR TODO BIEN
      setForm({ student_id: "", charge_id: "", recibido: 0 });
      setSearch("");
    },
  });

  /* ================= FILTER ================= */

  const filtered = payments.filter((p: any) =>
    p.students.full_name
      .toLowerCase()
      .includes(search.toLowerCase())
  );


  /* ================= UI ================= */

  return (
    <DashboardLayout
      title="Mensualidades"
      subtitle="Control de pagos mensuales"
    >
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Buscar estudiante..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Mensualidad
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Pago de Mensualidad</DialogTitle>
            </DialogHeader>

            {/* ================= BUSCAR ESTUDIANTE ================= */}

            <label className="text-sm font-medium">Estudiante</label>
            <Input
              placeholder="Buscar estudiante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <div className="border rounded max-h-40 overflow-y-auto">
                {students
                  .filter((s: any) =>
                    s.full_name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((s: any) => (
                    <div
                      key={s.id}
                      className="p-2 hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setForm({
                          student_id: s.id,
                          charge_id: "",
                          recibido: 0,
                        });
                        setSearch(s.full_name);
                      }}
                    >
                      <p>{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.grades?.name} {s.sections?.name}
                      </p>
                    </div>
                  ))}
              </div>
            )}


            {/* ================= MES ================= */}

            {form.student_id && (
              <>
                <div className="mt-4">
                  <label className="text-sm font-medium">Mes</label>

                  {(() => {
                    const studentCharges = charges
                      .filter((c: any) => String(c.student_id) === String(form.student_id))
                      .sort((a: any, b: any) => a.month - b.month);
                    if (studentCharges.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground mt-2">
                          Este estudiante no tiene mensualidades
                        </p>
                      );
                    }

                    return (
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={form.charge_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            charge_id: e.target.value,
                            recibido: 0,
                          })
                        }
                      >
                        <option value="">Seleccionar mes pendiente</option>

                        {studentCharges.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            Mes {c.month}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>


                {/* ================= TOTAL ================= */}

                {selectedCharge && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="text-sm font-medium">
                          Total mensualidad
                        </label>
                        <Input disabled value={`${simboloPago} ${totalInPayCurrency.toFixed(2)}`} />
                      </div>

                      <label className="text-sm font-medium mt-4">Moneda de pago</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={form.pay_currency}
                        onChange={(e) => setForm({ ...form, pay_currency: e.target.value })}
                      >
                        <option value="USD">Dólares ($)</option>
                        <option value="NIO">Córdobas (C$)</option>
                      </select>
                    </div>

                    {/* ================= RECIBIDO ================= */}

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="text-sm font-medium">
                          Recibido
                        </label>

                        <Input
                          inputMode="text"
                          pattern="[0-9]*"
                          value={String(form.recibido ?? "")}
                          onChange={(e) => {
                            const onlyDigits = e.target.value.replace(/\D/g, "");
                            setForm({ ...form, recibido: onlyDigits });
                          }}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Cambio
                        </label>
                        <Input disabled value={cambio > 0 ? `${simboloPago} ${cambio.toFixed(2)}` : ""} />
                      </div>
                    </div>

                    {/* ================= BOTÓN ================= */}

                    <Button
                      className="w-full mt-6"
                      disabled={
                        !form.charge_id ||
                        form.recibido < total ||
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
          </DialogContent>

        </Dialog>

      </div>

      {/* ================= TABLE ================= */}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estudiante</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead>Mes</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acción</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filtered.map((p: any) => {
            const simbolo =
              p.currency === "USD" ? "$" : "C$";

            return (
              <TableRow key={p.id}>
                <TableCell>
                  {p.students.full_name}
                </TableCell>
                <TableCell>Mensualidad</TableCell>
                <TableCell>{p.month}</TableCell>
                <TableCell>
                  {simbolo} {p.amount}
                </TableCell>
                <TableCell>
                  {p.currency === "USD"
                    ? "Dólares"
                    : "Córdobas"}
                </TableCell>
                <TableCell>
                  {new Date(p.paid_at).toLocaleString(
                    "es-NI",
                    {
                      timeZone: "America/Managua",
                    }
                  )}
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-700">
                    Pagado
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      imprimirRecibo({
                        estudiante:
                          p.students.full_name,
                        mes: p.month,
                        total: p.amount,
                        recibido: p.amount,
                        cambio: 0,
                        moneda: simbolo,
                        fecha: new Date(
                          p.paid_at
                        ).toLocaleString("es-NI", {
                          timeZone:
                            "America/Managua",
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

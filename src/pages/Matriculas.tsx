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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* ================= RECIBO ================= */

function imprimirRecibo(data: any) {
  const win = window.open("", "", "width=800,height=600");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>Recibo Matrícula</title>
        <style>
          body { font-family: Arial; font-size: 12px; padding: 20px; }
          h2 { text-align: center; }
          hr { margin: 10px 0; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <h2>Colegio Padre Bruno Martínez</h2>
        <p><strong>Fecha y Hora:</strong> ${data.fecha}</p>
        <p><strong>Estudiante:</strong> ${data.estudiante}</p>
        <hr />
        <p><strong>Concepto:</strong> Matrícula</p>
        <p><strong>Total:</strong> ${data.moneda} ${data.total}</p>
        <p><strong>Recibido:</strong> ${data.moneda} ${data.pagado}</p>
        <p><strong>Cambio:</strong> ${data.moneda} ${data.cambio}</p>
        <hr />
        <br /><br />
        ___________________________<br/>Firma
      </body>
    </html>
  `);

  win.document.close();
}

/* ================= FETCH ================= */

const fetchData = async (year: number) => {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
  id,
  student_id,
  total_amount,
  paid_amount,
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

  const { data: students } = await supabase
    .from("students")
    .select(`
    id,
    full_name,
    guardians ( full_name, phone ),
    enrollments (
      id,
      total_amount,
      paid_amount,
      academic_year
    )
  `)
    .order("full_name");


  return { enrollments: enrollments ?? [], students: students ?? [] };
};

const getEnrollmentByStudent = (studentId: string) => {
  return enrollments.find((e: any) => e.student_id === studentId);
};

/* ================= COMPONENT ================= */

export default function Matriculas() {
  const qc = useQueryClient();
  const year = new Date().getFullYear();

  const { data } = useQuery({
    queryKey: ["matriculas", year],
    queryFn: () => fetchData(year),
  });
  const [saldoPendiente, setSaldoPendiente] = useState(0);

  const enrollments = data?.enrollments ?? [];
  const students = data?.students ?? [];

  const getEnrollmentByStudent = (studentId: string) => {
    return enrollments.find((e: any) => e.student_id === studentId);
  };



  /* ================= STATE ================= */

  const [openAdd, setOpenAdd] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [currency, setCurrency] = useState<"NIO" | "USD">("NIO");
  const [total, setTotal] = useState(300);
  const [paid, setPaid] = useState(0);

  const cambio = Math.max(paid - total, 0);

  const estado =
    paid === 0 ? "PENDIENTE" : paid < total ? "PARCIAL" : "PAGADO";

  const filteredStudents = useMemo(() => {
    if (!search) return [];
    return students.filter((s: any) =>
      `${s.full_name} ${s.guardians?.full_name} ${s.guardians?.phone}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [students, search]);

  /* ================= MUTATION ================= */

  const createEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error("NO_STUDENT");

      const now = new Date().toISOString();

      const { data: existing } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .eq("academic_year", year)
        .maybeSingle();

      if (!existing) {
        const status = paid < total ? "PARCIAL" : "PAGADO";

        await supabase.from("enrollments").insert({
          student_id: selectedStudent.id,
          academic_year: year,
          total_amount: total,
          paid_amount: paid,
          currency,
          status,
          enrolled_at: now,
        });

      } else {
        const totalOriginal = Number(existing.total_amount);
        const alreadyPaid = Number(existing.paid_amount);
        const restante = totalOriginal - alreadyPaid;

        if (restante <= 0) {
          throw new Error("YA_PAGADO");
        }

        if (paid > restante) {
          throw new Error("EXCEDE_RESTANTE");
        }

        const newPaid = alreadyPaid + paid;

        const status =
          newPaid < totalOriginal
            ? "PARCIAL"
            : "PAGADO";

        await supabase
          .from("enrollments")
          .update({
            paid_amount: newPaid,
            status,
          })
          .eq("id", existing.id);
      }


      await supabase.from("payments").insert({
        student_id: selectedStudent.id,
        concept: "MATRICULA",
        amount: paid,
        currency,
        academic_year: year,
        paid_at: now,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["matriculas", year] });

      setOpenAdd(false);
      setPaid(0);
      setSearch("");
      setSelectedStudent(null);
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
            </DialogHeader>

            {/* ================= ESTUDIANTE ================= */}
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

                        setCurrency(existing.currency);
                        setTotal(totalOriginal);
                        setSaldoPendiente(restante > 0 ? restante : 0);
                      } else {
                        const base = currency === "USD" ? 8 : 300;
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
                        {s.grades?.name} {s.sections?.name ? `- ${s.sections?.name}` : ""}
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

            {/* ================= TOTAL + MONEDA ================= */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Total matrícula</label>
                <Input
                  type="number"
                  value={saldoPendiente}
                  disabled
                />
              </div>

              <div>
                <label className="text-sm font-medium">Moneda</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={currency}
                  onChange={(e) => {
                    const v = e.target.value as "NIO" | "USD";
                    setCurrency(v);
                    setTotal(v === "USD" ? 8 : 300); // ajusta a tu monto real
                    setPaid(0);
                  }}
                >
                  <option value="NIO">Córdobas (C$)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
            </div>

            {/* ================= RECIBIDO + CAMBIO ================= */}
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
                      : ""
                  }
                />
              </div>
            </div>

            {/* ================= BOTÓN ================= */}
            <Button
              className="w-full mt-6"
              disabled={
                !selectedStudent ||
                paid <= 0 ||
                paid > saldoPendiente ||
                saldoPendiente === 0
              }



              onClick={async () => {
                try {
                  await createEnrollment.mutateAsync();

                  await qc.invalidateQueries({ queryKey: ["matriculas", year] });

                  setOpenAdd(false);

                  setTimeout(() => {
                    imprimirRecibo({
                      estudiante: selectedStudent.full_name,
                      total,
                      pagado: paid,
                      cambio,
                      moneda: currency === "USD" ? "$" : "C$",
                      fecha: new Date().toLocaleString("es-NI", {
                        timeZone: "America/Managua",
                      }),
                    });
                  }, 300);

                } catch (err: any) {

                  if (err.message === "YA_PAGADO") {
                    setInfoMsg("Esta matrícula ya está completamente pagada.");
                  } else if (err.message === "EXCEDE_RESTANTE") {
                    setInfoMsg("El monto excede el saldo pendiente.");
                  } else {
                    setInfoMsg("Error al registrar matrícula");
                  }

                  setOpenInfo(true);
                }
              }}

            >
              Registrar Pago
            </Button>
          </DialogContent>

        </Dialog>
      </div>

      <Dialog open={openInfo} onOpenChange={setOpenInfo}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Atención</DialogTitle>
          </DialogHeader>
          <p>{infoMsg}</p>
          <Button className="mt-4 w-full" onClick={() => setOpenInfo(false)}>
            Aceptar
          </Button>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estudiante</TableHead>
            <TableHead>Grado</TableHead>
            <TableHead>Sección</TableHead>
            <TableHead>Monto Total</TableHead>
            <TableHead>Pagado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha y Hora</TableHead>
            <TableHead className="text-center">Acción</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {enrollments.map((e: any) => (
            <TableRow key={e.id}>
              <TableCell>{e.students?.full_name}</TableCell>

              <TableCell>
                {e.students?.grades?.name ?? "-"}
              </TableCell>

              <TableCell>
                {e.students?.sections?.name ?? "-"}
              </TableCell>

              <TableCell>
                {e.currency === "USD" ? "$" : "C$"} {e.total_amount}
              </TableCell>

              <TableCell>
                {e.currency === "USD" ? "$" : "C$"} {e.paid_amount}
              </TableCell>

              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs ${e.status === "PAGADO"
                    ? "bg-green-100 text-green-700"
                    : e.status === "PARCIAL"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                    }`}
                >
                  {e.status}
                </span>
              </TableCell>

              <TableCell>
                {new Date(e.enrolled_at).toLocaleString("es-NI", {
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
                    imprimirRecibo({
                      estudiante: e.students?.full_name,
                      total: e.total_amount,
                      pagado: e.paid_amount,
                      cambio: Math.max(e.paid_amount - e.total_amount, 0),
                      moneda: e.currency === "USD" ? "$" : "C$",
                      fecha: new Date(e.enrolled_at).toLocaleString("es-NI", {
                        timeZone: "America/Managua",
                      }),
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

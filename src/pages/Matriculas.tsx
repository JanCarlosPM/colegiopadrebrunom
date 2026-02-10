import { useState, useMemo } from "react";
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
        <p><strong>Fecha:</strong> ${data.fecha}</p>
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
      total_amount,
      paid_amount,
      currency,
      status,
      enrolled_at,
      students ( full_name )
    `)
    .eq("academic_year", year)
    .order("enrolled_at", { ascending: false });

  const { data: students } = await supabase
    .from("students")
    .select(`id, full_name, guardians ( full_name, phone )`)
    .order("full_name");

  return { enrollments: enrollments ?? [], students: students ?? [] };
};

/* ================= COMPONENT ================= */

export default function Matriculas() {
  const qc = useQueryClient();
  const year = new Date().getFullYear();
  const today = new Date().toISOString().substring(0, 10);

  const { data } = useQuery({
    queryKey: ["matriculas", year],
    queryFn: () => fetchData(year),
  });

  const enrollments = data?.enrollments ?? [];
  const students = data?.students ?? [];

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

      const { data: exists } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", selectedStudent.id)
        .eq("academic_year", year)
        .maybeSingle();

      if (exists) throw new Error("YA_MATRICULADO");

      await supabase.from("enrollments").insert({
        student_id: selectedStudent.id,
        academic_year: year,
        total_amount: total,
        paid_amount: paid,
        change_amount: cambio,
        currency,
        status: estado,
        enrolled_at: today,
      });

      if (paid > 0) {
        await supabase.from("payments").insert({
          student_id: selectedStudent.id,
          concept: "MATRICULA",
          amount: paid,
          currency,
          method: "EFECTIVO",
          academic_year: year,
          paid_at: today,
        });
      }
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
                    onClick={() => {
                      setSelectedStudent(s);
                      setSearch(s.full_name);
                    }}
                  >
                    <User className="h-4 w-4 mt-1" />
                    <div>
                      <p>{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.guardians?.phone}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TOTAL / MONEDA */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Total matrícula</label>
                <Input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(+e.target.value)}
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
                    setTotal(v === "USD" ? 8 : 300);
                  }}
                >
                  <option value="NIO">Córdobas (C$)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
            </div>

            {/* RECIBIDO / CAMBIO */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Recibido</label>
                <Input
                  type="number"
                  value={paid}
                  onChange={(e) => setPaid(+e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Cambio</label>
                <Input disabled value={cambio > 0 ? cambio : ""} />
              </div>
            </div>

            <Button
              className="w-full mt-6"
              onClick={async () => {
                try {
                  await createEnrollment.mutateAsync();
                  await qc.invalidateQueries({ queryKey: ["matriculas", year] });
                  setOpenAdd(false);

                  imprimirRecibo({
                    estudiante: selectedStudent.full_name,
                    total,
                    pagado: paid,
                    cambio,
                    moneda: currency === "USD" ? "$" : "C$",
                    fecha: today,
                  });
                } catch (err: any) {
                  setOpenAdd(false);
                  setInfoMsg(
                    err.message === "YA_MATRICULADO"
                      ? `${selectedStudent.full_name} ya se encuentra matriculado`
                      : "Error al registrar matrícula"
                  );
                  setOpenInfo(true);
                }
              }}
            >
              Registrar Pago
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* INFO */}
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

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estudiante</TableHead>
            <TableHead>Monto Total</TableHead>
            <TableHead>Pagado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {enrollments.map((e: any) => (
            <TableRow key={e.id}>
              <TableCell>{e.students?.full_name}</TableCell>
              <TableCell>C$ {e.total_amount}</TableCell>
              <TableCell>C$ {e.paid_amount}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    e.status === "PAGADO"
                      ? "bg-green-100 text-green-700"
                      : e.status === "PARCIAL"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {e.status}
                </span>
              </TableCell>
              <TableCell>{e.enrolled_at}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardLayout>
  );
}

import { useState, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* ================= FETCHERS ================= */

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
      students (
        id,
        full_name,
        guardians ( full_name, phone )
      )
    `)
    .eq("academic_year", year)
    .order("enrolled_at", { ascending: false });

  const { data: students } = await supabase
    .from("students")
    .select(`
      id,
      full_name,
      guardians ( full_name, phone )
    `)
    .order("full_name");

  return {
    enrollments: enrollments ?? [],
    students: students ?? [],
  };
};

/* ================= COMPONENT ================= */

export default function Matriculas() {
  const qc = useQueryClient();
  const year = new Date().getFullYear();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["matriculas", year],
    queryFn: () => fetchData(year),
  });

  const enrollments = data?.enrollments ?? [];
  const students = data?.students ?? [];

  /* ================= STATE ================= */

  const [openAdd, setOpenAdd] = useState(false);
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [currency, setCurrency] = useState<"NIO" | "USD">("NIO");
  const [amount, setAmount] = useState(300);
  const [paid, setPaid] = useState(0);

  const today = new Date().toISOString().substring(0, 10);
  const change = Math.max(paid - amount, 0);

  const status =
    paid === 0 ? "PENDIENTE" : paid < amount ? "PARCIAL" : "PAGADO";

  /* ================= AUTOCOMPLETE ================= */

  const filteredStudents = useMemo(() => {
    if (!searchStudent) return [];
    return students.filter((s: any) =>
      `${s.full_name} ${s.guardians?.full_name} ${s.guardians?.phone}`
        .toLowerCase()
        .includes(searchStudent.toLowerCase())
    );
  }, [students, searchStudent]);

  /* ================= MUTATION ================= */

  const createEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error("Seleccione un estudiante");

      // Validar matrícula única
      const { data: exists } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", selectedStudent.id)
        .eq("academic_year", year)
        .maybeSingle();

      if (exists) {
        throw new Error("Este estudiante ya tiene matrícula este año");
      }

      const { error } = await supabase.from("enrollments").insert({
        student_id: selectedStudent.id,
        academic_year: year,
        total_amount: amount,
        paid_amount: paid,
        change_amount: change,
        currency,
        status,
        enrolled_at: today,
      });

      if (error) throw error;

      if (paid > 0) {
        const { error: payErr } = await supabase.from("payments").insert({
          student_id: selectedStudent.id,
          concept: "MATRICULA",
          amount: paid,
          currency,
          method: "EFECTIVO",
          academic_year: year,
          paid_at: today,
        });
        if (payErr) throw payErr;
      }
    },
  });

  /* ================= UI ================= */

  return (
    <DashboardLayout title="Matrículas" subtitle="Pagos de matrícula">
      {/* TOOLBAR */}
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

            {/* ESTUDIANTE AUTOCOMPLETE */}
            <label className="text-sm font-medium">Estudiante</label>
            <div className="relative">
              <Input
                placeholder="Buscar por nombre, padre/madre o teléfono..."
                value={searchStudent}
                onChange={(e) => {
                  setSearchStudent(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />

              {showDropdown && filteredStudents.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 w-full bg-white border rounded shadow max-h-48 overflow-y-auto"
                >
                  {filteredStudents.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-2 hover:bg-muted cursor-pointer flex gap-2"
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchStudent(s.full_name);
                        setShowDropdown(false);
                      }}
                    >
                      <User className="h-4 w-4 mt-1" />
                      <div>
                        <p className="font-medium">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.guardians?.full_name} · {s.guardians?.phone}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MONTO / MONEDA */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Monto a pagar</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
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
                    setAmount(v === "USD" ? 8 : 300);
                  }}
                >
                  <option value="NIO">Córdobas (C$)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
            </div>

            {/* EFECTIVO / CAMBIO */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                type="number"
                placeholder="Monto entregado"
                value={paid}
                onChange={(e) => setPaid(Number(e.target.value))}
              />
              <Input value={change > 0 ? change : ""} disabled />
            </div>

            <div className="bg-muted p-3 rounded text-sm mt-4">
              Método de pago: <strong>Efectivo</strong>
            </div>

            <Button
              className="w-full mt-4"
              disabled={!selectedStudent || createEnrollment.isLoading}
              onClick={async () => {
                try {
                  await createEnrollment.mutateAsync();
                  await qc.invalidateQueries({
                    queryKey: ["matriculas", year],
                  });

                  setOpenAdd(false);
                  setSelectedStudent(null);
                  setSearchStudent("");
                  setPaid(0);
                  setCurrency("NIO");
                  setAmount(300);
                } catch (err: any) {
                  alert(err.message);
                }
              }}
            >
              Registrar Pago
            </Button>
          </DialogContent>
        </Dialog>
      </div>

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
              <TableCell>{e.currency === "USD" ? "$" : "C$"} {e.total_amount}</TableCell>
              <TableCell>{e.currency === "USD" ? "$" : "C$"} {e.paid_amount}</TableCell>
              <TableCell>{e.status}</TableCell>
              <TableCell>{e.enrolled_at}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardLayout>
  );
}

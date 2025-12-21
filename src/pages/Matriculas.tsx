import { useState } from "react";
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
import { Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* =========================
   FETCHERS
========================= */

const fetchEnrollments = async (year: number) => {
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      academic_year,
      amount,
      currency,
      payment_method,
      status,
      enrolled_at,
      students (
        id,
        full_name
      )
    `)
    .eq("academic_year", year)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

const fetchStudents = async () => {
  const { data, error } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("status", "ACTIVO")
    .order("full_name");

  if (error) throw error;
  return data;
};

const fetchSchoolSettings = async () => {
  const { data, error } = await supabase
    .from("school_settings")
    .select("current_academic_year")
    .single();

  if (error) throw error;
  return data;
};

/* =========================
   COMPONENT
========================= */

export default function Matriculas() {
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["school_settings"],
    queryFn: fetchSchoolSettings,
  });

  const currentYear = settings?.current_academic_year ?? new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [search, setSearch] = useState("");

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments", year],
    queryFn: () => fetchEnrollments(year),
    enabled: !!year,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
  });

  /* =========================
     SUMMARY
  ========================= */

  const total = enrollments.length;
  const totalAmount = enrollments.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const pending = enrollments.filter((e: any) => e.status === "PENDIENTE").length;

  /* =========================
     CREATE ENROLLMENT
  ========================= */

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState<any>({
    student_id: "",
    academic_year: year,
    amount: 0,
    payment_method: "",
    enrolled_at: "",
  });

  const createEnrollment = useMutation({
    mutationFn: async () => {
      await supabase.from("enrollments").insert({
        student_id: form.student_id,
        academic_year: form.academic_year,
        amount: form.amount,
        currency: "NIO",
        payment_method: form.payment_method,
        enrolled_at: form.enrolled_at || null,
        status: form.payment_method ? "PAGADO" : "PENDIENTE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollments", year] });
      setOpenAdd(false);
      setForm({
        student_id: "",
        academic_year: year,
        amount: 0,
        payment_method: "",
        enrolled_at: "",
      });
    },
  });

  /* =========================
     FILTER
  ========================= */

  const filtered = enrollments.filter((e: any) =>
    e.students?.full_name
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <DashboardLayout
      title="Matrículas"
      subtitle="Gestión de matrículas por año lectivo"
    >
      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Matrículas {year}</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Monto Recaudado</p>
          <p className="text-2xl font-bold text-success mt-1">
            C${totalAmount.toLocaleString()}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold text-warning mt-1">{pending}</p>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            placeholder="Buscar estudiante..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Matricular Estudiante
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Matrícula</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 mt-4">
              <Select onValueChange={(v) => setForm({ ...form, student_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Monto (C$)"
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />

              <Select onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="POS">POS</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                onChange={(e) => setForm({ ...form, enrolled_at: e.target.value })}
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenAdd(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => createEnrollment.mutate()}>
                  Registrar Matrícula
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Estudiante</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">
                  {e.students?.full_name}
                </TableCell>
                <TableCell>{e.academic_year}</TableCell>
                <TableCell>C${Number(e.amount).toLocaleString()}</TableCell>
                <TableCell>{e.payment_method || "-"}</TableCell>
                <TableCell>
                  {e.enrolled_at
                    ? new Date(e.enrolled_at).toLocaleDateString("es-NI")
                    : "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      e.status === "PAGADO"
                        ? "badge-success"
                        : "badge-warning"
                    }
                  >
                    {e.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}

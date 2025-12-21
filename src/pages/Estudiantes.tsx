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
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* =========================
   FETCHERS
========================= */

const fetchStudents = async () => {
  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      enrollment_code,
      full_name,
      status,
      guardian_id,
      guardians ( id, full_name, phone ),
      grades ( id, name ),
      sections ( id, name )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

const fetchGrades = async () => {
  const { data, error } = await supabase
    .from("grades")
    .select("id, name")
    .order("sort_order");
  if (error) throw error;
  return data;
};

const fetchSectionsByGrade = async (gradeId: string) => {
  if (!gradeId) return [];
  const { data, error } = await supabase
    .from("sections")
    .select("id, name")
    .eq("grade_id", gradeId);
  if (error) throw error;
  return data;
};

/* =========================
   COMPONENT
========================= */

export default function Estudiantes() {
  const qc = useQueryClient();

  /* =========================
     QUERIES
  ========================= */

  const { data: studentsData = [] } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
  });

  const { data: grades = [] } = useQuery({
    queryKey: ["grades"],
    queryFn: fetchGrades,
  });

  const [selectedGradeId, setSelectedGradeId] = useState("");

  const { data: sections = [] } = useQuery({
    queryKey: ["sections", selectedGradeId],
    queryFn: () => fetchSectionsByGrade(selectedGradeId),
    enabled: !!selectedGradeId,
  });

  /* =========================
     STATE
  ========================= */

  const [search, setSearch] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const emptyForm = {
    id: null,
    enrollment_code: "",
    full_name: "",
    guardian_id: null,
    guardian_name: "",
    guardian_phone: "",
    grade_id: "",
    section_id: "",
  };

  const [form, setForm] = useState<any>(emptyForm);

  const onChange = (k: string, v: any) =>
    setForm((p: any) => ({ ...p, [k]: v }));

  /* =========================
     ACTIONS (ÚNICAS, SIN DUPLICAR)
  ========================= */

  const openEditStudent = (s: any) => {
    setForm({
      id: s.id,
      enrollment_code: s.matricula !== "-" ? s.matricula : "",
      full_name: s.nombre,
      guardian_id: s.guardian_id,
      guardian_name: s.tutor,
      guardian_phone: s.telefono,
      grade_id: s.grade_id,
      section_id: s.section_id,
    });

    setSelectedGradeId(s.grade_id);
    setOpenEdit(true);
  };

  const openDeleteStudent = (s: any) => {
    setForm({ id: s.id });
    setOpenDelete(true);
  };

  /* =========================
     MUTATIONS
  ========================= */

  const createStudent = useMutation({
    mutationFn: async () => {
      const { data: guardian, error } = await supabase
        .from("guardians")
        .insert({
          full_name: form.guardian_name,
          phone: form.guardian_phone,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("students").insert({
        enrollment_code: form.enrollment_code || null,
        full_name: form.full_name,
        guardian_id: guardian.id,
        grade_id: form.grade_id,
        section_id: form.section_id,
        status: "ACTIVO",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setOpenAdd(false);
      setForm(emptyForm);
    },
  });

  const updateStudent = useMutation({
    mutationFn: async () => {
      await supabase
        .from("students")
        .update({
          enrollment_code: form.enrollment_code || null,
          full_name: form.full_name,
          grade_id: form.grade_id,
          section_id: form.section_id,
        })
        .eq("id", form.id);

      await supabase
        .from("guardians")
        .update({
          full_name: form.guardian_name,
          phone: form.guardian_phone,
        })
        .eq("id", form.guardian_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setOpenEdit(false);
      setForm(emptyForm);
    },
  });

  const deleteStudent = useMutation({
    mutationFn: async () => {
      await supabase.from("students").delete().eq("id", form.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setOpenDelete(false);
      setForm(emptyForm);
    },
  });

  /* =========================
     MAP + FILTER
  ========================= */

  const students = studentsData
    .map((s: any) => ({
      id: s.id,
      matricula: s.enrollment_code ?? "-",
      nombre: s.full_name,
      grado: s.grades?.name ?? "-",
      grade_id: s.grades?.id ?? "",
      seccion: s.sections?.name ?? "-",
      section_id: s.sections?.id ?? "",
      tutor: s.guardians?.full_name ?? "-",
      telefono: s.guardians?.phone ?? "-",
      guardian_id: s.guardians?.id ?? null,
      estado: s.status === "ACTIVO" ? "solvente" : "moroso",
    }))
    .filter((s: any) =>
      `${s.nombre} ${s.matricula} ${s.grado} ${s.seccion}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  /* =========================
     RENDER
  ========================= */

  return (
    <DashboardLayout title="Estudiantes" subtitle="Gestión de estudiantes matriculados">
      {/* TOOLBAR */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, matrícula, grado o sección"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Estudiante
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Estudiante</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input placeholder="Nombre" onChange={(e) => onChange("full_name", e.target.value)} />
              <Input placeholder="Matrícula" onChange={(e) => onChange("enrollment_code", e.target.value)} />

              <Select onValueChange={(v) => {
                onChange("grade_id", v);
                setSelectedGradeId(v);
                onChange("section_id", "");
              }}>
                <SelectTrigger><SelectValue placeholder="Grado" /></SelectTrigger>
                <SelectContent>
                  {grades.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={(v) => onChange("section_id", v)}>
                <SelectTrigger><SelectValue placeholder="Sección" /></SelectTrigger>
                <SelectContent>
                  {sections.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input placeholder="Tutor" onChange={(e) => onChange("guardian_name", e.target.value)} />
              <Input placeholder="Teléfono" onChange={(e) => onChange("guardian_phone", e.target.value)} />

              <div className="col-span-2 flex justify-end mt-4">
                <Button onClick={() => createStudent.mutate()}>
                  Guardar Estudiante
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
              <TableHead>Matrícula</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Grado</TableHead>
              <TableHead>Sección</TableHead>
              <TableHead>Tutor</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {students.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-primary">{s.matricula}</TableCell>
                <TableCell>{s.nombre}</TableCell>
                <TableCell>{s.grado}</TableCell>
                <TableCell>{s.seccion}</TableCell>
                <TableCell>{s.tutor}</TableCell>
                <TableCell>{s.telefono}</TableCell>
                <TableCell>
                  <Badge className={cn("badge-success")}>{s.estado}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEditStudent(s)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => openDeleteStudent(s)}>
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Estudiante</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Input value={form.full_name} onChange={(e) => onChange("full_name", e.target.value)} />
            <Input value={form.enrollment_code} onChange={(e) => onChange("enrollment_code", e.target.value)} />

            <Select value={form.grade_id} onValueChange={(v) => {
              onChange("grade_id", v);
              setSelectedGradeId(v);
              onChange("section_id", "");
            }}>
              <SelectTrigger><SelectValue placeholder="Grado" /></SelectTrigger>
              <SelectContent>
                {grades.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={form.section_id} onValueChange={(v) => onChange("section_id", v)}>
              <SelectTrigger><SelectValue placeholder="Sección" /></SelectTrigger>
              <SelectContent>
                {sections.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input value={form.guardian_name} onChange={(e) => onChange("guardian_name", e.target.value)} />
            <Input value={form.guardian_phone} onChange={(e) => onChange("guardian_phone", e.target.value)} />

            <div className="col-span-2 flex justify-end mt-4">
              <Button onClick={() => updateStudent.mutate()}>
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar estudiante?</DialogTitle>
          </DialogHeader>
          <p>Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpenDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteStudent.mutate()}>
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

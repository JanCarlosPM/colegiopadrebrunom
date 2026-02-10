import { useState } from "react";
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

const fetchStudents = async () => {
  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      full_name,
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

  const [search, setSearch] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const emptyForm = {
    id: null,
    full_name: "",
    guardian_id: null,
    guardian_name: "",
    guardian_phone: "",
    grade_id: "",
    section_id: null,
  };

  const [form, setForm] = useState<any>(emptyForm);
  const onChange = (k: string, v: any) =>
    setForm((p: any) => ({ ...p, [k]: v }));

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
        full_name: form.full_name,
        guardian_id: guardian.id,
        grade_id: form.grade_id,
        section_id: form.section_id || null,
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
          full_name: form.full_name,
          grade_id: form.grade_id,
          section_id: form.section_id || null,
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
      nombre: s.full_name,
      grado: s.grades?.name ?? "-",
      grade_id: s.grades?.id ?? "",
      seccion: s.sections?.name ?? "-",
      section_id: s.sections?.id ?? null,
      tutor: s.guardians?.full_name ?? "-",
      telefono: s.guardians?.phone ?? "-",
      guardian_id: s.guardians?.id ?? null,
    }))
    .filter((s: any) =>
      `${s.nombre} ${s.grado} ${s.seccion} ${s.tutor} ${s.telefono}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  /* =========================
     RENDER
  ========================= */

  return (
    <DashboardLayout title="Estudiantes" subtitle="Gestión de estudiantes">
      {/* TOOLBAR */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            placeholder="Buscar por estudiante, tutor, teléfono o grado"
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
              <DialogTitle>Registro de Estudiante</DialogTitle>
            </DialogHeader>

            {/* FORM */}
            <div className="space-y-6 mt-4">
              {/* ESTUDIANTE */}
              <div>
                <h3 className="font-semibold mb-3">
                  Información del Estudiante
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Nombre completo"
                    onChange={(e) =>
                      onChange("full_name", e.target.value)
                    }
                  />

                  <Select
                    onValueChange={(v) => {
                      onChange("grade_id", v);
                      setSelectedGradeId(v);
                      onChange("section_id", null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Grado" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {sections.length > 0 && (
                    <Select
                      onValueChange={(v) =>
                        onChange("section_id", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sección (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* TUTOR */}
              <div>
                <h3 className="font-semibold mb-3">
                  Información del Padre o Madre
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Nombre completo"
                    onChange={(e) =>
                      onChange("guardian_name", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Teléfono"
                    onChange={(e) =>
                      onChange("guardian_phone", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => createStudent.mutate()}>
                  Guardar Estudiante
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Nombre</TableHead>
            <TableHead>Grado</TableHead>
            <TableHead>Sección</TableHead>
            <TableHead>Tutor</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {students.map((s: any) => (
            <TableRow key={s.id}>
              <TableCell>{s.nombre}</TableCell>
              <TableCell>{s.grado}</TableCell>
              <TableCell>{s.seccion}</TableCell>
              <TableCell>{s.tutor}</TableCell>
              <TableCell>{s.telefono}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setForm(s);
                    setSelectedGradeId(s.grade_id);
                    setOpenEdit(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setForm({ id: s.id });
                    setOpenDelete(true);
                  }}
                >
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* DELETE */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar estudiante?</DialogTitle>
          </DialogHeader>
          <p>Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpenDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteStudent.mutate()}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

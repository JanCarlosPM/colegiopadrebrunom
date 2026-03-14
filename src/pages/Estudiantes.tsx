import { useMemo, useState } from "react";
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
import { Plus, Search, Pencil, Power, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type GuardianRow = { id: string; full_name: string | null; phone: string | null };
type GradeRow = { id: string; name: string };
type SectionRow = { id: string; name: string };
type EnrollmentYearRow = { academic_year: number };

type StudentRow = {
  id: string;
  full_name: string;
  status: "ACTIVO" | "INACTIVO";
  created_at: string | null;
  guardians?: GuardianRow | null;
  grades?: GradeRow | null;
  sections?: SectionRow | null;
  enrollments?: EnrollmentYearRow[] | null;
};

type StudentListItem = {
  id: string;
  nombre: string;
  estado: "ACTIVO" | "INACTIVO";
  grado: string;
  grade_id: string;
  seccion: string;
  section_id: string | null;
  tutor: string;
  telefono: string;
  guardian_id: string | null;
  years: string[];
  created_at: string | null;
  fechaCreacion: string;
  anioCreacion: string;
};

type StudentFormState = {
  id: string | null;
  full_name: string;
  guardian_id: string | null;
  guardian_name: string;
  guardian_phone: string;
  grade_id: string;
  section_id: string | null;
  status: "ACTIVO" | "INACTIVO";
};

type QueryErrorLike = { message?: string; code?: string };

/* =========================
   FETCHERS
========================= */

const fetchStudents = async (): Promise<StudentRow[]> => {
  const { data, error } = await supabase
    .from("students")
    .select(`
  id,
  full_name,
  status,
  created_at,
  guardians ( id, full_name, phone ),
  grades ( id, name ),
  sections ( id, name ),
  enrollments ( academic_year )
`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StudentRow[];
};

const fetchGrades = async (): Promise<GradeRow[]> => {
  const { data, error } = await supabase
    .from("grades")
    .select("id, name")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as GradeRow[];
};

const fetchSectionsByGrade = async (gradeId: string): Promise<SectionRow[]> => {
  if (!gradeId) return [];
  const { data, error } = await supabase
    .from("sections")
    .select("id, name")
    .eq("grade_id", gradeId);
  if (error) throw error;
  return (data ?? []) as SectionRow[];
};

/* =========================
   COMPONENT
========================= */

export default function Estudiantes() {
  const qc = useQueryClient();

  const {
    data: studentsData = [],
    isError: studentsError,
    error: studentsErrorDetail,
    refetch: refetchStudents,
  } = useQuery({
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
  const [yearFilter, setYearFilter] = useState("todos");
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [togglingStudentId, setTogglingStudentId] = useState<string | null>(null);

  const emptyForm: StudentFormState = {
    id: null,
    full_name: "",
    guardian_id: null,
    guardian_name: "",
    guardian_phone: "",
    grade_id: "",
    section_id: null,
    status: "ACTIVO",
  };

  const [form, setForm] = useState<StudentFormState>(emptyForm);
  const onChange = <K extends keyof StudentFormState>(k: K, v: StudentFormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

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

      const { error: studentError } = await supabase
        .from("students")
        .insert({
          full_name: form.full_name,
          guardian_id: guardian.id,
          grade_id: form.grade_id,
          section_id: form.section_id || null,
          status: "ACTIVO",
        });

      if (studentError) {
        // Evita dejar tutor huérfano si falla la creación del estudiante.
        await supabase.from("guardians").delete().eq("id", guardian.id);
        throw studentError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setOpenAdd(false);
      setForm(emptyForm);
      setSelectedGradeId("");
      toast.success("Estudiante guardado correctamente.");
    },
    onError: (error: unknown) => {
      const err = (error ?? {}) as QueryErrorLike;
      if (err.code === "23505") {
        toast.error("Este estudiante ya está registrado.");
      } else {
        toast.error("Error al guardar estudiante.");
      }
    },
  });

  const updateStudent = useMutation({
    mutationFn: async () => {
      // Si está inactivo, solo permitimos cambio de estado
      if (form.status === "INACTIVO") {
        const { error } = await supabase
          .from("students")
          .update({
            status: form.status,
          })
          .eq("id", form.id);

        if (error) throw error;
        return;
      }

      const { error: studentError } = await supabase
        .from("students")
        .update({
          full_name: form.full_name,
          grade_id: form.grade_id,
          section_id: form.section_id || null,
          status: form.status,
        })
        .eq("id", form.id);

      if (studentError) throw studentError;

      const { error: guardianError } = await supabase
        .from("guardians")
        .update({
          full_name: form.guardian_name,
          phone: form.guardian_phone,
        })
        .eq("id", form.guardian_id);

      if (guardianError) throw guardianError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setOpenEdit(false);
      setForm(emptyForm);
      setSelectedGradeId("");
      toast.success("Estudiante actualizado correctamente.");
    },
    onError: () => {
      toast.error("Error al actualizar estudiante.");
    },
  });

  const toggleStudentStatus = useMutation({
    mutationFn: async ({
      id,
      currentStatus,
    }: {
      id: string;
      currentStatus: string;
    }) => {
      const newStatus = currentStatus === "ACTIVO" ? "INACTIVO" : "ACTIVO";

      const { error } = await supabase
        .from("students")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      return { id };
    },
    onMutate: async ({ id }) => {
      setTogglingStudentId(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast.success("Estado del estudiante actualizado.");
    },
    onError: () => {
      toast.error("No se pudo cambiar el estado del estudiante.");
    },
    onSettled: () => {
      setTogglingStudentId(null);
    },
  });

  /* =========================
     MAP + FILTER
  ========================= */

  const allYears = useMemo(() => {
    const years = studentsData.flatMap((s) =>
      (s.enrollments || []).map((e) => String(e.academic_year))
    );
    return [...new Set(years)].sort((a, b) => Number(b) - Number(a));
  }, [studentsData]);

  const students: StudentListItem[] = studentsData
    .map((s) => ({
      id: s.id,
      nombre: s.full_name,
      estado: s.status ?? "ACTIVO",
      grado: s.grades?.name ?? "-",
      grade_id: s.grades?.id ?? "",
      seccion: s.sections?.name ?? "-",
      section_id: s.sections?.id ?? null,
      tutor: s.guardians?.full_name ?? "-",
      telefono: s.guardians?.phone ?? "-",
      guardian_id: s.guardians?.id ?? null,
      years: (s.enrollments || []).map((e) => String(e.academic_year)),
      created_at: s.created_at,
      fechaCreacion: s.created_at
        ? new Date(s.created_at).toLocaleDateString("es-NI", {
          timeZone: "America/Managua",
        })
        : "-",
      anioCreacion: s.created_at
        ? String(new Date(s.created_at).getFullYear())
        : "",
    }))
    .filter((s) => {
      const matchesSearch = `${s.nombre} ${s.grado} ${s.seccion} ${s.tutor} ${s.telefono} ${s.estado}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesYear =
        yearFilter === "todos" || s.years.includes(yearFilter);

      return matchesSearch && matchesYear;
    });

  /* =========================
     RENDER
  ========================= */

  return (
    <DashboardLayout title="Estudiantes" subtitle="Gestión de estudiantes">
      {studentsError && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-center justify-between gap-2">
          <span>
            No se pudieron cargar los estudiantes. {String((studentsErrorDetail as QueryErrorLike)?.message || "")}
          </span>
          <Button variant="outline" size="sm" onClick={() => refetchStudents()}>
            Reintentar
          </Button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            placeholder="Buscar por estudiante, tutor, teléfono, grado o estado"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full md:w-48">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los años</SelectItem>
              {allYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog
          open={openAdd}
          onOpenChange={(value) => {
            setOpenAdd(value);
            if (!value) {
              setForm(emptyForm);
              setSelectedGradeId("");
            }
          }}
        >
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

            <div className="space-y-6 mt-4">
              <div>
                <h3 className="font-semibold mb-3">
                  Información del Estudiante
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      placeholder="Nombre completo"
                      value={form.full_name}
                      onChange={(e) =>
                        onChange("full_name", e.target.value)
                      }
                    />
                    {form.full_name?.trim() === "" && (
                      <p className="text-xs text-red-500 mt-1">
                        El nombre del estudiante es obligatorio
                      </p>
                    )}
                  </div>

                  <div>
                    <Select
                      value={form.grade_id}
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
                        {grades.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!form.grade_id && (
                      <p className="text-xs text-red-500 mt-1">
                        Debe seleccionar un grado
                      </p>
                    )}
                  </div>

                  {sections.length > 0 && (
                    <Select
                      value={form.section_id || ""}
                      onValueChange={(v) =>
                        onChange("section_id", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sección (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">
                  Información del Padre o Madre
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Nombre del Padre o Madre
                    </label>

                    <Input
                      placeholder="Ingrese nombre completo"
                      value={form.guardian_name}
                      onChange={(e) =>
                        onChange("guardian_name", e.target.value)
                      }
                    />

                    {!form.guardian_name?.trim() && (
                      <p className="text-xs text-red-500 mt-1">
                        El nombre del tutor es obligatorio
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Teléfono
                    </label>

                    <Input
                      placeholder="Ingrese teléfono"
                      value={form.guardian_phone}
                      maxLength={8}
                      onChange={(e) =>
                        onChange(
                          "guardian_phone",
                          e.target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 8)
                        )
                      }
                    />

                    {!form.guardian_phone?.trim() && (
                      <p className="text-xs text-red-500 mt-1">
                        El teléfono es obligatorio
                      </p>
                    )}

                    {form.guardian_phone &&
                      form.guardian_phone.length < 8 && (
                        <p className="text-xs text-red-500 mt-1">
                          El teléfono debe tener 8 dígitos
                        </p>
                      )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => createStudent.mutate()}
                  disabled={
                    createStudent.isPending ||
                    !form.full_name?.trim() ||
                    !form.guardian_name.trim() ||
                    !form.guardian_phone.trim() ||
                    form.guardian_phone.length < 8 ||
                    !form.grade_id
                  }
                >
                  {createStudent.isPending
                    ? "Guardando..."
                    : "Guardar Estudiante"}
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
            <TableHead>Estado</TableHead>
            <TableHead>Fecha creación</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {students.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.nombre}</TableCell>
              <TableCell>{s.grado}</TableCell>
              <TableCell>{s.seccion}</TableCell>
              <TableCell>{s.tutor}</TableCell>
              <TableCell>{s.telefono}</TableCell>
              <TableCell>
                <Badge
                  className={
                    s.estado === "ACTIVO"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {s.estado}
                </Badge>
              </TableCell>
              <TableCell>{s.fechaCreacion}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setForm({
                      id: s.id,
                      full_name: s.nombre,
                      guardian_id: s.guardian_id,
                      guardian_name: s.tutor,
                      guardian_phone: s.telefono === "-" ? "" : s.telefono,
                      grade_id: s.grade_id,
                      section_id: s.section_id,
                      status: s.estado,
                    });
                    setSelectedGradeId(s.grade_id);
                    setOpenEdit(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>

                <Button
                  size="sm"
                  variant={s.estado === "ACTIVO" ? "destructive" : "default"}
                  disabled={toggleStudentStatus.isPending && togglingStudentId === s.id}
                  onClick={() =>
                    toggleStudentStatus.mutate({
                      id: s.id,
                      currentStatus: s.estado,
                    })
                  }
                >
                  {toggleStudentStatus.isPending && togglingStudentId === s.id ? (
                    "Procesando..."
                  ) : s.estado === "ACTIVO" ? (
                    <>
                      <Power className="h-4 w-4 mr-1" />
                      Inactivar
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Activar
                    </>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* EDITAR */}
      <Dialog
        open={openEdit}
        onOpenChange={(value) => {
          setOpenEdit(value);
          if (!value) {
            setForm(emptyForm);
            setSelectedGradeId("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Estudiante</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div>
              <h3 className="font-semibold mb-3">
                Información del Estudiante
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    placeholder="Nombre completo"
                    value={form.full_name || ""}
                    disabled={form.status === "INACTIVO"}
                    onChange={(e) =>
                      onChange("full_name", e.target.value)
                    }
                  />
                  {!form.full_name?.trim() && form.status === "ACTIVO" && (
                    <p className="text-xs text-red-500 mt-1">
                      El nombre es obligatorio
                    </p>
                  )}
                </div>

                <div>
                  <Select
                    value={form.grade_id || ""}
                    onValueChange={(v) => {
                      onChange("grade_id", v);
                      setSelectedGradeId(v);
                      onChange("section_id", null);
                    }}
                    disabled={form.status === "INACTIVO"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Grado" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!form.grade_id && form.status === "ACTIVO" && (
                    <p className="text-xs text-red-500 mt-1">
                      Debe seleccionar un grado
                    </p>
                  )}
                </div>

                {sections.length > 0 && (
                  <Select
                    value={form.section_id || ""}
                    onValueChange={(v) =>
                      onChange("section_id", v)
                    }
                    disabled={form.status === "INACTIVO"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sección (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="col-span-2">
                  <label className="text-sm font-medium block mb-1">
                    Estado
                  </label>
                  <Select
                    value={form.status || "ACTIVO"}
                    onValueChange={(v) => onChange("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVO">ACTIVO</SelectItem>
                      <SelectItem value="INACTIVO">INACTIVO</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.status === "INACTIVO" && (
                    <p className="text-xs text-amber-600 mt-1">
                      El estudiante está inactivo. No se pueden editar sus datos hasta activarlo nuevamente.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">
                Información del Padre o Madre
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Nombre del Padre o Madre
                  </label>

                  <Input
                    placeholder="Ingrese nombre completo"
                    value={form.guardian_name || ""}
                    disabled={form.status === "INACTIVO"}
                    onChange={(e) =>
                      onChange("guardian_name", e.target.value)
                    }
                  />

                  {!form.guardian_name?.trim() && form.status === "ACTIVO" && (
                    <p className="text-xs text-red-500 mt-1">
                      El nombre del tutor es obligatorio
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Teléfono
                  </label>

                  <Input
                    placeholder="Ingrese teléfono"
                    value={form.guardian_phone || ""}
                    maxLength={8}
                    disabled={form.status === "INACTIVO"}
                    onChange={(e) =>
                      onChange(
                        "guardian_phone",
                        e.target.value
                          .replace(/[^0-9]/g, "")
                          .slice(0, 8)
                      )
                    }
                  />

                  {!form.guardian_phone?.trim() && form.status === "ACTIVO" && (
                    <p className="text-xs text-red-500 mt-1">
                      El teléfono es obligatorio
                    </p>
                  )}

                  {form.guardian_phone &&
                    form.guardian_phone.length < 8 &&
                    form.status === "ACTIVO" && (
                      <p className="text-xs text-red-500 mt-1">
                        El teléfono debe tener 8 dígitos
                      </p>
                    )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpenEdit(false);
                  setForm(emptyForm);
                  setSelectedGradeId("");
                }}
              >
                Cancelar
              </Button>

              <Button
                onClick={() => updateStudent.mutate()}
                disabled={
                  updateStudent.isPending ||
                  (form.status === "ACTIVO" &&
                    (
                      !form.full_name?.trim() ||
                      !form.grade_id ||
                      !form.guardian_name?.trim() ||
                      !form.guardian_phone?.trim() ||
                      form.guardian_phone.length < 8
                    ))
                }
              >
                {updateStudent.isPending
                  ? "Guardando..."
                  : form.status === "INACTIVO"
                    ? "Guardar Estado"
                    : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
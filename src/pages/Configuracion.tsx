import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GraduationCap, Plus, Edit, Trash2, Save, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/* ================= TIPOS ================= */

type SettingsRow = {
  id?: string;
  school_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  current_academic_year?: number | null;
  enrollments_open?: boolean | null;
  matricula_amount_nio?: number | null;
  matricula_amount_usd?: number | null;
  alertas_morosidad?: boolean | null;
  recordatorios_pago?: boolean | null;
  reportes_semanales?: boolean | null;
  discount_siblings_enabled?: boolean | null;
  discount_early_enabled?: boolean | null;
  logo_url?: string | null;
};

type GradeRow = { id: string; name: string; sort_order?: number | null };
type GradePriceRow = { id: string; grade_id: string; amount_nio: number; amount_usd: number };
type AppUserRow = { id: string; email: string; full_name: string | null; role: string; is_active: boolean };

/* ================= FETCHERS ================= */

const fetchSettings = async (): Promise<SettingsRow | null> => {
  const { data, error } = await supabase
    .from("school_settings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const fetchGrades = async (): Promise<GradeRow[]> => {
  const { data, error } = await supabase
    .from("grades")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
};

const fetchGradePrices = async (): Promise<GradePriceRow[]> => {
  const { data, error } = await supabase.from("grade_prices").select("id, grade_id, amount_nio, amount_usd");
  if (error) throw error;
  return data ?? [];
};

const fetchAppUsers = async (): Promise<AppUserRow[]> => {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, email, full_name, role, is_active")
    .order("full_name", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
};

/* ================= COMPONENT ================= */

const Configuracion = () => {
  const qc = useQueryClient();

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["config-settings"],
    queryFn: fetchSettings,
  });

  const { data: grades = [], isLoading: loadingGrades } = useQuery({
    queryKey: ["grades"],
    queryFn: fetchGrades,
  });

  const { data: gradePrices = [], isLoading: loadingPrices } = useQuery({
    queryKey: ["grade-prices"],
    queryFn: fetchGradePrices,
  });

  const { data: appUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["app-users"],
    queryFn: fetchAppUsers,
  });

  const [generalForm, setGeneralForm] = useState<SettingsRow>({});
  const [preciosByGrade, setPreciosByGrade] = useState<Record<string, { nio: string; usd: string }>>({});
  const [matriculaNio, setMatriculaNio] = useState("");
  const [matriculaUsd, setMatriculaUsd] = useState("");
  const [matriculaDiscountSiblings, setMatriculaDiscountSiblings] = useState(true);
  const [matriculaDiscountEarly, setMatriculaDiscountEarly] = useState(false);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userEditId, setUserEditId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ full_name: "", email: "", role: "Cobrador" as const, password: "", is_active: true });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setGeneralForm({
        ...settings,
        school_name: settings.school_name ?? "Colegio Padre Bruno Martínez",
        address: settings.address ?? "Managua, Nicaragua",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        current_academic_year: settings.current_academic_year ?? new Date().getFullYear(),
        enrollments_open: settings.enrollments_open ?? true,
        alertas_morosidad: settings.alertas_morosidad ?? true,
        recordatorios_pago: settings.recordatorios_pago ?? true,
        reportes_semanales: settings.reportes_semanales ?? false,
        logo_url: settings.logo_url ?? null,
      });
      setMatriculaNio(String(settings.matricula_amount_nio ?? 300));
      setMatriculaUsd(String(settings.matricula_amount_usd ?? 8));
      setMatriculaDiscountSiblings(settings.discount_siblings_enabled ?? true);
      setMatriculaDiscountEarly(settings.discount_early_enabled ?? false);
    }
  }, [settings]);

  useEffect(() => {
    const next: Record<string, { nio: string; usd: string }> = {};
    grades.forEach((g) => {
      const pr = gradePrices.find((p) => p.grade_id === g.id);
      next[g.id] = {
        nio: pr ? String(pr.amount_nio) : "1500",
        usd: pr ? String(pr.amount_usd) : "50",
      };
    });
    setPreciosByGrade(next);
  }, [grades, gradePrices]);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const saveGeneral = useMutation({
    mutationFn: async () => {
      const year = generalForm.current_academic_year ?? new Date().getFullYear();
      const payload = {
        school_name: generalForm.school_name || null,
        address: generalForm.address || null,
        phone: generalForm.phone || null,
        email: generalForm.email || null,
        current_academic_year: Number(year) || new Date().getFullYear(),
        enrollments_open: generalForm.enrollments_open ?? true,
        alertas_morosidad: generalForm.alertas_morosidad ?? true,
        recordatorios_pago: generalForm.recordatorios_pago ?? true,
        reportes_semanales: generalForm.reportes_semanales ?? false,
        logo_url: generalForm.logo_url || null,
      };
      if (settings?.id) {
        const { error } = await supabase.from("school_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-settings"] });
      qc.invalidateQueries({ queryKey: ["academic-year"] });
      toast.success("Configuración general guardada");
    },
    onError: (e: Error) => toast.error(e.message || "Error al guardar"),
  });

  const savePrecios = useMutation({
    mutationFn: async () => {
      for (const g of grades) {
        const vals = preciosByGrade[g.id];
        if (!vals) continue;
        const amountNio = Number(vals.nio) || 0;
        const amountUsd = Number(vals.usd) || 0;
        const existing = gradePrices.find((p) => p.grade_id === g.id);
        if (existing) {
          await supabase
            .from("grade_prices")
            .update({ amount_nio: amountNio, amount_usd: amountUsd, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          await supabase.from("grade_prices").insert({ grade_id: g.id, amount_nio: amountNio, amount_usd: amountUsd });
        }
      }
      const payload: Partial<SettingsRow> = {
        matricula_amount_nio: Number(matriculaNio) || 0,
        matricula_amount_usd: Number(matriculaUsd) || 0,
        discount_siblings_enabled: matriculaDiscountSiblings,
        discount_early_enabled: matriculaDiscountEarly,
        current_academic_year: settings?.current_academic_year ?? new Date().getFullYear(),
      };
      if (settings?.id) {
        const { error } = await supabase.from("school_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-settings", "grade-prices"] });
      toast.success("Precios guardados");
    },
    onError: (e: Error) => toast.error(e.message || "Error al guardar precios"),
  });

  const createOrUpdateUser = useMutation({
    mutationFn: async () => {
      if (userEditId) {
        const { error } = await supabase
          .from("app_users")
          .update({
            full_name: userForm.full_name || null,
            role: userForm.role,
            is_active: userForm.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userEditId);
        if (error) throw error;
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: { data: { full_name: userForm.full_name } },
      });
      if (error) throw error;
      if (!data.user) throw new Error("No se creó el usuario");
      const { error: insertError } = await supabase.from("app_users").insert({
        id: data.user.id,
        email: userForm.email,
        full_name: userForm.full_name || null,
        role: userForm.role,
        is_active: true,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-users"] });
      setUserDialogOpen(false);
      setUserEditId(null);
      setUserForm({ full_name: "", email: "", role: "Cobrador", password: "", is_active: true });
      toast.success(userEditId ? "Usuario actualizado" : "Usuario creado");
    },
    onError: (e: Error) => toast.error(e.message || "Error al guardar usuario"),
  });

  const setUserInactive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("app_users").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-users"] });
      setDeleteUserId(null);
      toast.success("Usuario desactivado");
    },
    onError: (e: Error) => toast.error(e.message || "Error"),
  });

  const openEditUser = (u: AppUserRow) => {
    setUserEditId(u.id);
    setUserForm({
      full_name: u.full_name ?? "",
      email: u.email,
      role: u.role as "Cobrador" | "Administrador",
      password: "",
      is_active: u.is_active,
    });
    setUserDialogOpen(true);
  };

  return (
    <DashboardLayout title="Configuración" subtitle="Ajustes del sistema contable">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="precios">Precios</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Colegio</CardTitle>
                <CardDescription>Datos institucionales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="input-label">Nombre del Colegio</Label>
                  <Input
                    value={generalForm.school_name ?? ""}
                    onChange={(e) => setGeneralForm((f) => ({ ...f, school_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="input-label">Dirección</Label>
                  <Input
                    value={generalForm.address ?? ""}
                    onChange={(e) => setGeneralForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="input-label">Teléfono</Label>
                  <Input
                    value={generalForm.phone ?? ""}
                    onChange={(e) => setGeneralForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="input-label">Correo Electrónico</Label>
                  <Input
                    type="email"
                    value={generalForm.email ?? ""}
                    onChange={(e) => setGeneralForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <Button onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending || loadingSettings}>
                  {saveGeneral.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Cambios
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logotipo</CardTitle>
                <CardDescription>Imagen institucional del colegio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  {settings?.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="w-32 h-32 object-contain rounded-2xl border" />
                  ) : (
                    <div className="w-32 h-32 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <GraduationCap className="w-16 h-16 text-primary" />
                    </div>
                  )}
                  <Input
                    placeholder="URL del logo (opcional)"
                    value={generalForm.logo_url ?? ""}
                    onChange={(e) => setGeneralForm((f) => ({ ...f, logo_url: e.target.value }))}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">Pegue la URL de una imagen para el logo</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Año Lectivo</CardTitle>
                <CardDescription>Configuración del período académico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="input-label">Año Lectivo Actual</Label>
                  <Select
                    value={String(generalForm.current_academic_year ?? currentYear)}
                    onValueChange={(v) => setGeneralForm((f) => ({ ...f, current_academic_year: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Matrículas Abiertas</p>
                    <p className="text-xs text-muted-foreground">Permitir nuevas matrículas</p>
                  </div>
                  <Switch
                    checked={generalForm.enrollments_open ?? true}
                    onCheckedChange={(v) => setGeneralForm((f) => ({ ...f, enrollments_open: v }))}
                  />
                </div>
                <Button onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending || loadingSettings}>
                  {saveGeneral.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notificaciones</CardTitle>
                <CardDescription>Configurar alertas del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Alertas de Morosidad</p>
                    <p className="text-xs text-muted-foreground">Notificar estudiantes morosos</p>
                  </div>
                  <Switch
                    checked={generalForm.alertas_morosidad ?? true}
                    onCheckedChange={(v) => setGeneralForm((f) => ({ ...f, alertas_morosidad: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Recordatorios de Pago</p>
                    <p className="text-xs text-muted-foreground">Enviar recordatorios automáticos</p>
                  </div>
                  <Switch
                    checked={generalForm.recordatorios_pago ?? true}
                    onCheckedChange={(v) => setGeneralForm((f) => ({ ...f, recordatorios_pago: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Reportes Semanales</p>
                    <p className="text-xs text-muted-foreground">Recibir resumen semanal</p>
                  </div>
                  <Switch
                    checked={generalForm.reportes_semanales ?? false}
                    onCheckedChange={(v) => setGeneralForm((f) => ({ ...f, reportes_semanales: v }))}
                  />
                </div>
                <Button onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending || loadingSettings}>
                  {saveGeneral.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usuarios */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Gestión de Usuarios</CardTitle>
                <CardDescription>Administradores y cobradores del sistema</CardDescription>
              </div>
              <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setUserEditId(null); setUserForm({ full_name: "", email: "", role: "Cobrador", password: "", is_active: true }); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{userEditId ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 mt-4">
                    <div>
                      <Label className="input-label">Nombre Completo</Label>
                      <Input
                        placeholder="Nombre del usuario"
                        value={userForm.full_name}
                        onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="input-label">Correo Electrónico</Label>
                      <Input
                        type="email"
                        placeholder="correo@colegio.edu.ni"
                        value={userForm.email}
                        onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                        disabled={!!userEditId}
                      />
                    </div>
                    <div>
                      <Label className="input-label">Rol</Label>
                      <Select
                        value={userForm.role}
                        onValueChange={(v: "Cobrador" | "Administrador") => setUserForm((f) => ({ ...f, role: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cobrador">Cobrador</SelectItem>
                          <SelectItem value="Administrador">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {userEditId && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Estado</p>
                          <p className="text-xs text-muted-foreground">Usuario activo puede iniciar sesión</p>
                        </div>
                        <Switch
                          checked={userForm.is_active}
                          onCheckedChange={(v) => setUserForm((f) => ({ ...f, is_active: v }))}
                        />
                      </div>
                    )}
                    {!userEditId && (
                      <div>
                        <Label className="input-label">Contraseña</Label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={userForm.password}
                          onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
                    <Button
                      onClick={() => createOrUpdateUser.mutate()}
                      disabled={
                        createOrUpdateUser.isPending ||
                        !userForm.email.trim() ||
                        (!userEditId && !userForm.password)
                      }
                    >
                      {createOrUpdateUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {userEditId ? "Guardar" : "Crear Usuario"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Nombre</TableHead>
                      <TableHead className="font-semibold">Correo</TableHead>
                      <TableHead className="font-semibold">Rol</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No hay usuarios. Cree uno desde Supabase Auth o use el botón &quot;Nuevo Usuario&quot; (crea cuenta con correo y contraseña).
                        </TableCell>
                      </TableRow>
                    ) : (
                      appUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={user.is_active ? "badge-success" : "badge-warning"}>
                              {user.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(user)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteUserId(user.id)}
                                disabled={!user.is_active}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Desactivar usuario?</AlertDialogTitle>
                <AlertDialogDescription>
                  El usuario no podrá iniciar sesión hasta que lo reactive. Puede editarlo después para activarlo de nuevo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground"
                  onClick={() => deleteUserId && setUserInactive.mutate(deleteUserId)}
                >
                  Desactivar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* Precios */}
        <TabsContent value="precios">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mensualidades</CardTitle>
                <CardDescription>Montos mensuales por grado (C$ y USD)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingGrades || loadingPrices ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : grades.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay grados. Cree grados en la base de datos (preescolar a 11°).</p>
                ) : (
                  <>
                    {grades.map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-4 flex-wrap">
                        <span className="text-sm font-medium min-w-[120px]">{g.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">C$</span>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            className="w-24 text-right"
                            value={preciosByGrade[g.id]?.nio ?? ""}
                            onChange={(e) =>
                              setPreciosByGrade((prev) => ({
                                ...prev,
                                [g.id]: { ...(prev[g.id] ?? { nio: "", usd: "" }), nio: e.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className="w-24 text-right"
                            value={preciosByGrade[g.id]?.usd ?? ""}
                            onChange={(e) =>
                              setPreciosByGrade((prev) => ({
                                ...prev,
                                [g.id]: { ...(prev[g.id] ?? { nio: "", usd: "" }), usd: e.target.value },
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Button className="w-full mt-4" onClick={() => savePrecios.mutate()} disabled={savePrecios.isPending}>
                      {savePrecios.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Guardar Precios
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Matrícula</CardTitle>
                <CardDescription>Monto de matrícula y descuentos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="input-label">Monto Matrícula C$ (córdobas)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={matriculaNio}
                    onChange={(e) => setMatriculaNio(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="input-label">Monto Matrícula USD (dólares)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={matriculaUsd}
                    onChange={(e) => setMatriculaUsd(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Descuento por Hermanos</p>
                    <p className="text-xs text-muted-foreground">Aplicar descuento por hermanos</p>
                  </div>
                  <Switch checked={matriculaDiscountSiblings} onCheckedChange={setMatriculaDiscountSiblings} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pronto Pago</p>
                    <p className="text-xs text-muted-foreground">Descuento por pago anticipado</p>
                  </div>
                  <Switch checked={matriculaDiscountEarly} onCheckedChange={setMatriculaDiscountEarly} />
                </div>
                <Button className="w-full mt-4" onClick={() => savePrecios.mutate()} disabled={savePrecios.isPending}>
                  {savePrecios.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Configuración
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Configuracion;

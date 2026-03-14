import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatMoney, normalizeCurrency } from "@/lib/billing";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  canApplyInputChange,
  validateAmountByCurrency,
} from "@/lib/paymentValidation";
import {
  isMissingTableError,
  mapSupabaseErrorToToast,
} from "@/lib/errorHandling";

type Student = {
  id: string;
  full_name: string;
  grades?: { name?: string | null } | null;
  sections?: { name?: string | null } | null;
};

type PaymentItem = {
  id: string;
  name: string;
  category: string;
  default_amount: number;
  currency: "NIO" | "USD";
  is_active: boolean;
};

type AppUser = {
  id: string;
  role: "Administrador" | "Cobrador";
  is_active: boolean;
};

type OtherPaymentRow = {
  id: string;
  item_name: string | null;
  amount: number;
  received_amount: number;
  change_amount: number;
  currency: "NIO" | "USD";
  status: "COMPLETADO" | "PARCIAL";
  payment_date: string;
  students?: { full_name?: string | null } | null;
  payment_items?: { name?: string | null; category?: string | null } | null;
};

const ITEM_CATEGORIES = ["PROMOCION", "GRADUACION", "LIBROS", "UNIFORME", "OTROS"] as const;

const fetchStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, grades(name), sections(name)")
    .eq("status", "ACTIVO")
    .order("full_name");
  if (error) throw error;
  return data ?? [];
};

const fetchItems = async (): Promise<PaymentItem[]> => {
  const { data, error } = await supabase
    .from("payment_items")
    .select("id, name, category, default_amount, currency, is_active")
    .order("name");
  if (error) throw error;
  return data ?? [];
};

const fetchCurrentAppUser = async (): Promise<AppUser | null> => {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const userId = authData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("app_users")
    .select("id, role, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const fetchOtherPayments = async (year: number): Promise<OtherPaymentRow[]> => {
  const { data, error } = await supabase
    .from("other_payments")
    .select(`
      id,
      student_id,
      item_id,
      item_name,
      amount,
      received_amount,
      change_amount,
      currency,
      status,
      payment_date,
      notes,
      academic_year,
      students ( full_name, grades(name), sections(name) ),
      payment_items ( name, category )
    `)
    .eq("academic_year", year)
    .order("payment_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OtherPaymentRow[];
};

export default function OtrosCobros() {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [tableSearch, setTableSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [openPayment, setOpenPayment] = useState(false);
  const [openItem, setOpenItem] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    student_id: "",
    item_id: "",
    amount: "",
    received: "",
    currency: "NIO" as "NIO" | "USD",
    notes: "",
  });
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "OTROS",
    default_amount: "",
    currency: "NIO" as "NIO" | "USD",
  });

  const { data: students = [] } = useQuery({ queryKey: ["students-active"], queryFn: fetchStudents });
  const { data: items = [], error: itemsError } = useQuery({ queryKey: ["payment-items"], queryFn: fetchItems, retry: false });
  const { data: currentAppUser } = useQuery({
    queryKey: ["current-app-user"],
    queryFn: fetchCurrentAppUser,
    retry: false,
  });
  const { data: payments = [], isLoading: loadingPayments, error: paymentsError } = useQuery({
    queryKey: ["other-payments", year],
    queryFn: () => fetchOtherPayments(year),
    retry: false,
  });

  const schemaNotReady = isMissingTableError(itemsError) || isMissingTableError(paymentsError);

  const selectedItem = useMemo(
    () => items.find((it) => it.id === paymentForm.item_id),
    [items, paymentForm.item_id]
  );

  const selectedStudent = useMemo(
    () => students.find((st) => st.id === paymentForm.student_id),
    [students, paymentForm.student_id]
  );

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    if (!term) return [];
    return students.filter((s) =>
      `${s.full_name} ${s.grades?.name ?? ""} ${s.sections?.name ?? ""}`.toLowerCase().includes(term)
    );
  }, [students, studentSearch]);

  const filteredPayments = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter((p) =>
      `${p.students?.full_name ?? ""} ${p.item_name ?? ""} ${p.payment_items?.category ?? ""} ${p.status ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [payments, tableSearch]);

  const currency = normalizeCurrency(paymentForm.currency);
  const amountValidation = validateAmountByCurrency(paymentForm.received, currency);
  const isReceivedValid = amountValidation.isValid;

  const amountToCharge = Number(paymentForm.amount || 0);
  const receivedNum = amountValidation.numericValue;
  const applied = Math.min(amountToCharge, receivedNum);
  const change = Math.max(receivedNum - applied, 0);
  const status = applied + 0.0001 >= amountToCharge ? "COMPLETADO" : "PARCIAL";
  const canManageItems =
    !!currentAppUser && currentAppUser.is_active && currentAppUser.role === "Administrador";

  const createItem = useMutation({
    mutationFn: async () => {
      if (!canManageItems) throw new Error("Solo un administrador puede crear conceptos.");
      if (!itemForm.name.trim()) throw new Error("Nombre requerido");
      const amount = Number(itemForm.default_amount || 0);
      if (amount <= 0) throw new Error("Monto inválido");

      const { error } = await supabase.from("payment_items").insert({
        name: itemForm.name.trim(),
        category: itemForm.category,
        default_amount: amount,
        currency: itemForm.currency,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-items"] });
      toast.success("Concepto creado");
      setOpenItem(false);
      setItemForm({ name: "", category: "OTROS", default_amount: "", currency: "NIO" });
    },
    onError: (e: unknown) =>
      isMissingTableError(e)
        ? toast.error("Falta aplicar la migración del módulo. Ejecuta 002_other_payments_module.sql en Supabase.")
        : toast.error(
            mapSupabaseErrorToToast(e, {
              fallback: "No se pudo crear el concepto",
            })
          ),
  });

  const createOtherPayment = useMutation({
    mutationFn: async () => {
      if (!paymentForm.student_id) throw new Error("Selecciona estudiante");
      if (!paymentForm.item_id) throw new Error("Selecciona concepto");
      if (amountToCharge <= 0) throw new Error("Monto inválido");
      if (!isReceivedValid) throw new Error("Recibido inválido");

      const { error } = await supabase.from("other_payments").insert({
        student_id: paymentForm.student_id,
        item_id: paymentForm.item_id,
        item_name: selectedItem?.name ?? "Cobro especial",
        amount: Number(applied.toFixed(2)),
        received_amount: Number(receivedNum.toFixed(2)),
        change_amount: Number(change.toFixed(2)),
        currency,
        status,
        payment_date: new Date().toISOString(),
        academic_year: year,
        notes: paymentForm.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["other-payments", year] });
      toast.success("Pago registrado correctamente");
      setOpenPayment(false);
      setPaymentForm({
        student_id: "",
        item_id: "",
        amount: "",
        received: "",
        currency: "NIO",
        notes: "",
      });
      setStudentSearch("");
    },
    onError: (e: unknown) =>
      isMissingTableError(e)
        ? toast.error("Falta aplicar la migración del módulo. Ejecuta 002_other_payments_module.sql en Supabase.")
        : toast.error(
            mapSupabaseErrorToToast(e, {
              currency,
              fallback: "No se pudo registrar el pago",
            })
          ),
  });

  return (
    <DashboardLayout
      title="Otros Cobros"
      subtitle="Graduación, promoción, libros, uniformes y cobros especiales"
    >
      {schemaNotReady && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Este módulo requiere tablas nuevas en Supabase. Ejecuta el script
          <strong> `supabase/migrations/002_other_payments_module.sql` </strong>
          en el SQL Editor y luego recarga la página.
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <Input
          placeholder="Buscar por estudiante o concepto..."
          value={tableSearch}
          onChange={(e) => setTableSearch(e.target.value)}
          className="md:flex-1"
        />
        <div className="w-full md:w-40">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog
          open={openItem}
          onOpenChange={(value) => {
            setOpenItem(value);
            if (!value) {
              setItemForm({ name: "", category: "OTROS", default_amount: "", currency: "NIO" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" disabled={schemaNotReady || !canManageItems}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Concepto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear concepto de cobro</DialogTitle>
              <DialogDescription>
                Ejemplos: toga, paquete de graduación, libros, uniforme.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <FormField label="Nombre del concepto">
                <Input
                  value={itemForm.name}
                  onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                />
              </FormField>

              <FormField label="Categoría">
                <Select
                  value={itemForm.category}
                  onValueChange={(v) => setItemForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Moneda">
                  <Select
                    value={itemForm.currency}
                    onValueChange={(v: "NIO" | "USD") =>
                      setItemForm((f) => ({ ...f, currency: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NIO">Córdobas</SelectItem>
                      <SelectItem value="USD">Dólares</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Monto por defecto">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={itemForm.default_amount}
                    onChange={(e) =>
                      setItemForm((f) => ({ ...f, default_amount: e.target.value }))
                    }
                  />
                </FormField>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenItem(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createItem.mutate()}
                disabled={createItem.isPending || !itemForm.name.trim() || Number(itemForm.default_amount || 0) <= 0}
              >
                {createItem.isPending ? "Guardando..." : "Guardar concepto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openPayment}
          onOpenChange={(value) => {
            setOpenPayment(value);
            if (!value) {
              setPaymentForm({
                student_id: "",
                item_id: "",
                amount: "",
                received: "",
                currency: "NIO",
                notes: "",
              });
              setStudentSearch("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={schemaNotReady}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar cobro especial</DialogTitle>
              <DialogDescription>
                No se mezcla con matrículas ni mensualidades.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <FormField label="Estudiante">
                <Input
                  placeholder="Buscar estudiante..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                {studentSearch && (
                  <div className="border rounded max-h-40 overflow-y-auto mt-2">
                    {filteredStudents.length === 0 && (
                      <p className="p-3 text-sm text-muted-foreground">
                        No se encontraron estudiantes.
                      </p>
                    )}
                    {filteredStudents.map((st) => (
                      <div
                        key={st.id}
                        className="p-2.5 border-b last:border-b-0 cursor-pointer hover:bg-muted"
                        onClick={() => {
                          setPaymentForm((f) => ({ ...f, student_id: st.id }));
                          setStudentSearch(st.full_name);
                        }}
                      >
                        <p className="font-medium text-sm">{st.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {st.grades?.name ?? "Sin grado"} {st.sections?.name ?? ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </FormField>

              <FormField label="Concepto">
                <Select
                  value={paymentForm.item_id}
                  onValueChange={(value) => {
                    const item = items.find((it) => it.id === value);
                    setPaymentForm((f) => ({
                      ...f,
                      item_id: value,
                      amount: String(item?.default_amount ?? ""),
                      currency: normalizeCurrency(item?.currency ?? "NIO"),
                      received: "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar concepto" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.filter((it) => it.is_active).map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        {it.name} ({it.category}) - {formatMoney(it.default_amount, it.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Moneda">
                  <Select
                    value={paymentForm.currency}
                    onValueChange={(v: "NIO" | "USD") =>
                      setPaymentForm((f) => ({ ...f, currency: v, received: "" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NIO">Córdobas</SelectItem>
                      <SelectItem value="USD">Dólares</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Monto a cobrar">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                    }
                  />
                </FormField>
              </div>

              <FormField
                label="Recibido"
                hint={`Máximo ${currency === "USD" ? "3" : "4"} cifras (${currency === "USD" ? "999.99" : "9999.99"})`}
              >
                <Input
                  inputMode="decimal"
                  value={paymentForm.received}
                  onChange={(e) => {
                    const raw = e.target.value.replace(",", ".");
                    if (!canApplyInputChange(raw, currency)) return;
                    setPaymentForm((f) => ({ ...f, received: raw }));
                  }}
                />
              </FormField>

              <div className="rounded-md border p-3 text-sm bg-muted/20">
                <div className="flex justify-between">
                  <span>Monto aplicado:</span>
                  <span className="font-semibold">{formatMoney(applied, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cambio:</span>
                  <span className="font-semibold">{formatMoney(change, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className="font-semibold">{status}</span>
                </div>
              </div>

              <FormField label="Detalle (opcional)">
                <Input
                  placeholder="Ejemplo: paquete completo, cuota 1, etc."
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </FormField>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenPayment(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createOtherPayment.mutate()}
                disabled={
                  createOtherPayment.isPending ||
                  !selectedStudent ||
                  !selectedItem ||
                  !isReceivedValid ||
                  amountToCharge <= 0
                }
              >
                {createOtherPayment.isPending ? "Registrando..." : "Registrar pago"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!schemaNotReady && !canManageItems && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Tu rol actual no puede crear conceptos nuevos. Sí puedes registrar pagos usando conceptos existentes.
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estudiante</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Recibido</TableHead>
            <TableHead>Cambio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!loadingPayments && filteredPayments.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No hay cobros especiales registrados para este año.
              </TableCell>
            </TableRow>
          )}
          {filteredPayments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.students?.full_name ?? "—"}</TableCell>
              <TableCell>{p.item_name ?? p.payment_items?.name ?? "—"}</TableCell>
              <TableCell>{p.payment_items?.category ?? "OTROS"}</TableCell>
              <TableCell>{formatMoney(Number(p.amount || 0), p.currency)}</TableCell>
              <TableCell>{formatMoney(Number(p.received_amount || 0), p.currency)}</TableCell>
              <TableCell>{formatMoney(Number(p.change_amount || 0), p.currency)}</TableCell>
              <TableCell>
                <StatusBadge status={p.status} />
              </TableCell>
              <TableCell>
                {new Date(p.payment_date).toLocaleString("es-NI", {
                  timeZone: "America/Managua",
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardLayout>
  );
}

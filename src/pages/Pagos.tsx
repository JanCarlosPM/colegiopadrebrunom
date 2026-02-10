import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* ================= FETCHERS ================= */

const fetchPayments = async () => {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      method,
      paid_at,
      concept,
      students (
        full_name,
        grades ( name ),
        sections ( name )
      ),
      charges ( month )
    `)
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return data;
};

const fetchPendingCharges = async () => {
  const { data, error } = await supabase
    .from("charges")
    .select(`
      id,
      month,
      amount,
      students (
        id,
        full_name,
        grades ( name ),
        sections ( name )
      )
    `)
    .eq("status", "PENDIENTE");

  if (error) throw error;
  return data;
};

/* ================= COMPONENT ================= */

export default function Pagos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
  });

  const { data: charges = [] } = useQuery({
    queryKey: ["charges-pending"],
    queryFn: fetchPendingCharges,
  });

  /* ================= CREATE PAYMENT ================= */

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    charge_id: "",
    amount: 0,
    method: "",
  });

  const createPayment = useMutation({
    mutationFn: async () => {
      const charge = charges.find((c: any) => c.id === form.charge_id);

      // 1️⃣ Insertar pago
      await supabase.from("payments").insert({
        student_id: charge.students.id,
        charge_id: charge.id,
        concept: "MENSUALIDAD",
        month: charge.month,
        amount: form.amount,
        method: form.method,
      });

      // 2️⃣ Marcar deuda como pagada
      await supabase
        .from("charges")
        .update({ status: "PAGADO" })
        .eq("id", charge.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["charges-pending"] });
      setOpen(false);
    },
  });

  /* ================= FILTER ================= */

  const filtered = payments.filter((p: any) =>
    p.students.full_name.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= UI ================= */

  return (
    <DashboardLayout title="Pagos" subtitle="Cobranza de mensualidades">
      {/* TOOLBAR */}
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Buscar estudiante..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2" /> Registrar Pago
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
            </DialogHeader>

            <Select
              onValueChange={(v) => setForm({ ...form, charge_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Deuda pendiente" />
              </SelectTrigger>
              <SelectContent>
                {charges.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.students.full_name} — {c.students.grades.name}{" "}
                    {c.students.sections.name} — Mes {c.month} — C$
                    {c.amount}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Monto"
              onChange={(e) =>
                setForm({ ...form, amount: Number(e.target.value) })
              }
            />

            <Select
              onValueChange={(v) => setForm({ ...form, method: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => createPayment.mutate()}>
              Registrar
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estudiante</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead>Mes</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((p: any) => (
            <TableRow key={p.id}>
              <TableCell>
                {p.students.full_name}
                <div className="text-xs text-muted-foreground">
                  {p.students.grades.name} {p.students.sections.name}
                </div>
              </TableCell>
              <TableCell>{p.concept}</TableCell>
              <TableCell>{p.charges?.month}</TableCell>
              <TableCell>C${p.amount}</TableCell>
              <TableCell>{p.method}</TableCell>
              <TableCell>
                {new Date(p.paid_at).toLocaleDateString("es-NI")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardLayout>
  );
}

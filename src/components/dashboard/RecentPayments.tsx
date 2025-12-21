import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const payments = [
  {
    id: 1,
    student: "María García López",
    grade: "5to Grado A",
    amount: 1500,
    method: "Efectivo",
    time: "Hace 5 min",
    concept: "Mensualidad Diciembre",
  },
  {
    id: 2,
    student: "Carlos Martínez Ruiz",
    grade: "3er Grado B",
    amount: 3000,
    method: "Transferencia",
    time: "Hace 15 min",
    concept: "Matrícula 2025",
  },
  {
    id: 3,
    student: "Ana Sofía Hernández",
    grade: "1er Grado A",
    amount: 1500,
    method: "POS",
    time: "Hace 30 min",
    concept: "Mensualidad Diciembre",
  },
  {
    id: 4,
    student: "Luis Fernando Pérez",
    grade: "6to Grado A",
    amount: 1500,
    method: "Pocket Lafise",
    time: "Hace 1 hora",
    concept: "Mensualidad Diciembre",
  },
];

const methodColors: Record<string, string> = {
  Efectivo: "bg-success/10 text-success border-success/20",
  Transferencia: "bg-info/10 text-info border-info/20",
  POS: "bg-warning/10 text-warning border-warning/20",
  "Pocket Lafise": "bg-primary/10 text-primary border-primary/20",
};

export function RecentPayments() {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Pagos Recientes</h3>
          <p className="text-sm text-muted-foreground">Últimas transacciones del día</p>
        </div>
        <a
          href="/pagos"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ver todos →
        </a>
      </div>
      <div className="space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-medium text-secondary-foreground">
                  {payment.student
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{payment.student}</p>
                <p className="text-xs text-muted-foreground">
                  {payment.concept} • {payment.grade}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                C${payment.amount.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0", methodColors[payment.method])}
                >
                  {payment.method}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{payment.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

type RecentPayment = {
  id: string;
  amount: number;
  currency: "NIO" | "USD";
  concept: string;
  method?: string | null;
  month?: number | null;
  paid_at: string;
  students?: {
    full_name?: string | null;
    grades?: { name?: string | null } | null;
    sections?: { name?: string | null } | null;
  } | null;
};

function formatNicaraguaTime(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleString("es-NI", {
    timeZone: "America/Managua",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function getMethodLabel(payment: RecentPayment) {
  if (payment.currency === "USD") return "DOLAR";
  if (payment.currency === "NIO") return "EFECTIVO";
  return payment.method || "PAGO";
}

function getDescription(payment: RecentPayment) {
  const grade = payment.students?.grades?.name ?? "";
  const section = payment.students?.sections?.name ?? "";

  if (payment.concept === "MENSUALIDAD") {
    const monthName = payment.month ? MONTHS[payment.month - 1] : "";
    return `Mensualidad ${monthName} • ${grade} ${section}`.trim();
  }

  if (payment.concept === "MATRICULA") {
    return `Matrícula • ${grade} ${section}`.trim();
  }

  return `${capitalize(payment.concept)} • ${grade} ${section}`.trim();
}

export function RecentPayments() {
  const { data = [] } = useQuery({
    queryKey: ["recent-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          currency,
          concept,
          method,
          month,
          paid_at,
          students (
            full_name,
            grades ( name ),
            sections ( name )
          )
        `)
        .order("paid_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data ?? []) as RecentPayment[];
    },
  });

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Pagos Recientes</h3>
          <p className="text-sm text-muted-foreground">
            Últimas transacciones del día
          </p>
        </div>
        <a
          href="/pagos"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ver todos →
        </a>
      </div>

      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay pagos registrados.
          </p>
        ) : (
          data.map((payment) => {
            const initials = payment.students?.full_name
              ?.split(" ")
              .map((n: string) => n[0])
              .slice(0, 2)
              .join("");

            const methodLabel = getMethodLabel(payment);

            const methodClass =
              methodLabel === "EFECTIVO"
                ? "bg-success/10 text-success border-success/20"
                : methodLabel === "DOLAR"
                ? "bg-info/10 text-info border-info/20"
                : "bg-muted text-muted-foreground";

            return (
              <div
                key={payment.id}
                className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-medium text-secondary-foreground">
                      {initials}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {payment.students?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getDescription(payment)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {payment.currency === "USD" ? "$" : "C$"}{" "}
                    {Number(payment.amount).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0", methodClass)}
                    >
                      {methodLabel}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatNicaraguaTime(payment.paid_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
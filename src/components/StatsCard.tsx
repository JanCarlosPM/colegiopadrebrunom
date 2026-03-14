import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "success" | "destructive" | "warning" | "primary";
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  variant = "primary",
}: StatsCardProps) {
  const colors = {
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
    primary: "bg-primary/10 text-primary",
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </div>

      <div
        className={`h-10 w-10 flex items-center justify-center rounded-lg ${colors[variant]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

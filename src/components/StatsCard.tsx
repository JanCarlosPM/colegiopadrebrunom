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
    success: "bg-green-100 text-green-700",
    destructive: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    primary: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm p-5 flex items-center justify-between">
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

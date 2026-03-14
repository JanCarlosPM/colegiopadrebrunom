import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusVariant } from "@/lib/billing";

type StatusBadgeProps = {
  status?: string | null;
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = getStatusVariant(status);
  const normalized = String(label ?? status ?? "—");

  return (
    <Badge
      variant="outline"
      className={cn(
        variant === "success" && "bg-green-100 text-green-700 border-green-200",
        variant === "warning" && "bg-yellow-100 text-yellow-700 border-yellow-200",
        variant === "destructive" && "bg-red-100 text-red-700 border-red-200",
        variant === "neutral" && "bg-gray-100 text-gray-700 border-gray-200",
        className
      )}
    >
      {normalized}
    </Badge>
  );
}

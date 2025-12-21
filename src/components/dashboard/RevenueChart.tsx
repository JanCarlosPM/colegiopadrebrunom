import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { mes: "Ene", ingresos: 45000 },
  { mes: "Feb", ingresos: 52000 },
  { mes: "Mar", ingresos: 48000 },
  { mes: "Abr", ingresos: 61000 },
  { mes: "May", ingresos: 55000 },
  { mes: "Jun", ingresos: 47000 },
  { mes: "Jul", ingresos: 59000 },
  { mes: "Ago", ingresos: 63000 },
  { mes: "Sep", ingresos: 58000 },
  { mes: "Oct", ingresos: 64000 },
  { mes: "Nov", ingresos: 52000 },
  { mes: "Dic", ingresos: 48000 },
];

export function RevenueChart() {
  return (
    <div className="metric-card h-[350px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Ingresos por Mes</h3>
          <p className="text-sm text-muted-foreground">Año lectivo 2024</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span className="text-xs text-muted-foreground">Ingresos</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="mes"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) => `C$${value / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              boxShadow: "var(--shadow-md)",
            }}
            formatter={(value: number) => [`C$${value.toLocaleString()}`, "Ingresos"]}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          />
          <Bar
            dataKey="ingresos"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
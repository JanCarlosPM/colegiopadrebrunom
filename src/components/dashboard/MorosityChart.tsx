import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Solventes", value: 342, color: "hsl(var(--success))" },
  { name: "Morosos", value: 58, color: "hsl(var(--destructive))" },
];

export function MorosityChart() {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  const morosityPercentage = ((data[1].value / total) * 100).toFixed(1);

  return (
    <div className="metric-card h-[350px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Estado de Morosidad</h3>
          <p className="text-sm text-muted-foreground">{morosityPercentage}% de morosidad</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              boxShadow: "var(--shadow-md)",
            }}
            formatter={(value: number, name: string) => [
              `${value} estudiantes (${((value / total) * 100).toFixed(1)}%)`,
              name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: "hsl(var(--foreground))", fontSize: "13px" }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface GaugeChartProps {
  value: number;
  max: number;
  label: string;
  size?: number;
}

export function GaugeChart({ value, max, label, size = 160 }: GaugeChartProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const remaining = 100 - percentage;

  const data = [
    { name: "completed", value: percentage },
    { name: "remaining", value: remaining },
  ];

  const color =
    percentage >= 100 ? "#10B981" : percentage >= 70 ? "#3B82F6" : percentage >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size / 2 + 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius={size * 0.3}
              outerRadius={size * 0.42}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center -mt-4">
        <p className="text-2xl font-bold">{percentage.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

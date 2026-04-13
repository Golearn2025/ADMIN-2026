"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface PaymentStatusChartProps {
  data: Array<{ name: string; value: number }>;
}

const COLORS = {
  SUCCEEDED: "#10b981",
  PAID: "#10b981",
  PENDING: "#f59e0b",
  PROCESSING: "#f59e0b",
  FAILED: "#ef4444",
  CANCELED: "#ef4444",
  NO_PAYMENT: "#9ca3af",
};

export function PaymentStatusChart({ data }: PaymentStatusChartProps) {
  const getColor = (name: string) => {
    const key = name.toUpperCase() as keyof typeof COLORS;
    return COLORS[key] || "#6b7280";
  };

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }: { name?: string; percent?: number }) =>
              name && percent !== undefined ? `${name} ${(percent * 100).toFixed(0)}%` : ''
            }
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => [`${value ?? 0} payments`, "Count"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

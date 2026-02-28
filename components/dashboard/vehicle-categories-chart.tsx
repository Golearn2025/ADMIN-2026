"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface VehicleCategoriesChartProps {
  data: Array<{ name: string; value: number }>;
}

export function VehicleCategoriesChart({ data }: VehicleCategoriesChartProps) {
  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid
            stroke="#f0f0f0"
            strokeWidth={0.5}
            strokeOpacity={0.1}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="#9ca3af"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number) => `${value} bookings`}
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
            }}
            labelStyle={{
              color: '#111827',
              fontWeight: 600,
              fontSize: '13px',
              marginBottom: '4px'
            }}
            itemStyle={{
              color: '#374151',
              fontSize: '13px'
            }}
            cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
          />
          <Bar
            dataKey="value"
            fill="#8b5cf6"
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

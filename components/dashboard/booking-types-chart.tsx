"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface BookingTypesChartProps {
  data: Array<{ name: string; value: number }>;
}

const COLORS = ["#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4"];

export function BookingTypesChart({ data }: BookingTypesChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            labelLine={false}
            outerRadius={85}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `${value} bookings`}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={50}
            iconType="circle"
            iconSize={10}
            wrapperStyle={{
              paddingTop: '16px',
              fontSize: '13px',
              lineHeight: '24px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useEffect, useState } from "react";
import { format } from "date-fns";

export default function PerformanceChart({ assessments }) {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!assessments?.length) return;

    const sorted = [...assessments].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    const formatted = sorted.map((a, index) => ({
      x: index,
      label: format(new Date(a.createdAt), "MMM dd HH:mm"),
      score: Number(a.quizScore),
    }));

    setChartData(formatted);
  }, [assessments]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="gradient-title text-3xl md:text-4xl">
          Performance Trend
        </CardTitle>
        <CardDescription>Your quiz scores over time</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="relative w-full min-w-0" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

              <XAxis
                dataKey="x"
                tickFormatter={(i) => chartData[i]?.label}
                tick={{ fontSize: 12 }}
              />

              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;

                  const { score, label } = payload[0].payload;

                  return (
                    <div className="bg-background border rounded-md px-3 py-2 shadow text-xs">
                      <p className="font-semibold">{score}%</p>
                      <p className="text-muted-foreground">{label}</p>
                    </div>
                  );
                }}
              />

              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

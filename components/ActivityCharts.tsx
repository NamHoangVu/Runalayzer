"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActivityStreamPoint } from "@/lib/supabase/types";
import { formatDuration } from "@/lib/format";

interface ActivityChartsProps {
  streams: ActivityStreamPoint[];
  activityType: string;
}

const PACE_LIKE_TYPES = new Set(["Run", "Walk", "Hike"]);

function tickFormatter(seconds: number) {
  return formatDuration(seconds);
}

export default function ActivityCharts({ streams, activityType }: ActivityChartsProps) {
  if (streams.length === 0) return null;

  const isPaceLike = PACE_LIKE_TYPES.has(activityType);
  const data = streams.map((p) => ({
    ...p,
    paceOrSpeed:
      p.speed == null || p.speed <= 0
        ? null
        : isPaceLike
          ? 1000 / p.speed / 60 // min/km
          : p.speed * 3.6, // km/h
  }));

  const hasHr = streams.some((p) => p.hr != null);
  const hasCadence = streams.some((p) => p.cadence != null);
  const hasPaceOrSpeed = data.some((p) => p.paceOrSpeed != null);
  const hasPower = streams.some((p) => p.power != null);
  const hasGct = streams.some((p) => p.gct != null);
  const hasVo = streams.some((p) => p.vo != null);
  const hasSl = streams.some((p) => p.sl != null);
  const hasPc = streams.some((p) => p.pc != null);

  return (
    <div className="flex flex-col gap-6">
      {(hasHr || hasCadence) && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground/70">Heart rate and cadence</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeOpacity={0.1} />
              <XAxis dataKey="t" tickFormatter={tickFormatter} fontSize={12} />
              <YAxis yAxisId="hr" fontSize={12} />
              <YAxis yAxisId="cadence" orientation="right" fontSize={12} />
              <Tooltip labelFormatter={(t) => formatDuration(Number(t))} />
              <Legend />
              {hasHr && (
                <Line
                  yAxisId="hr"
                  type="monotone"
                  dataKey="hr"
                  name="Heart rate (bpm)"
                  stroke="#dc2626"
                  dot={false}
                  connectNulls
                />
              )}
              {hasCadence && (
                <Line
                  yAxisId="cadence"
                  type="monotone"
                  dataKey="cadence"
                  name="Cadence"
                  stroke="#f59e0b"
                  dot={false}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasPaceOrSpeed && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground/70">
            {isPaceLike ? "Pace (min/km, lower = faster)" : "Speed (km/h)"}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeOpacity={0.1} />
              <XAxis dataKey="t" tickFormatter={tickFormatter} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip labelFormatter={(t) => formatDuration(Number(t))} />
              <Line
                type="monotone"
                dataKey="paceOrSpeed"
                name={isPaceLike ? "Pace" : "Speed"}
                stroke="#2563eb"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(hasPower || hasGct || hasVo || hasSl || hasPc) && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground/70">Running dynamics</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeOpacity={0.1} />
              <XAxis dataKey="t" tickFormatter={tickFormatter} fontSize={12} />
              <YAxis yAxisId="left" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" fontSize={12} />
              <Tooltip labelFormatter={(t) => formatDuration(Number(t))} />
              <Legend />
              {hasPower && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="power"
                  name="Power (W)"
                  stroke="#a855f7"
                  dot={false}
                  connectNulls
                />
              )}
              {hasGct && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="gct"
                  name="Ground contact time (ms)"
                  stroke="#0ea5e9"
                  dot={false}
                  connectNulls
                />
              )}
              {hasVo && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="vo"
                  name="Vertical oscillation (cm)"
                  stroke="#22c55e"
                  dot={false}
                  connectNulls
                />
              )}
              {hasSl && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sl"
                  name="Stride length (cm)"
                  stroke="#eab308"
                  dot={false}
                  connectNulls
                />
              )}
              {hasPc && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pc"
                  name="Performance condition"
                  stroke="#64748b"
                  dot={false}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { Droplets } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getWaterLive, waterFallback } from "@/lib/api";
import { fmtDateTime, fmtNum, sortNewest } from "@/lib/format";
import type { WaterLiveReading, WaterRow } from "@/lib/types";

// Aqualert "leak suspected" → full-row RED critical highlight.
const isCritical = (r: WaterRow) => /leak/i.test(r.state);

// Status-based full-row tint: Healthy → green, Attention Needed → yellow.
const rowTint = (r: WaterRow) => {
  if (/healthy/i.test(r.state)) return "bg-green-100 hover:bg-green-100/80";
  if (/attention/i.test(r.state)) return "bg-yellow-100 hover:bg-yellow-100/80";
  return undefined;
};

function stateBadge(state: string) {
  if (/leak/i.test(state)) return <Badge variant="destructive">{state}</Badge>;
  if (/attention/i.test(state)) return <Badge variant="secondary">{state}</Badge>;
  return <Badge variant="outline">{state}</Badge>;
}

function LiveSensorCard({ reading }: { reading: WaterLiveReading | null }) {
  if (!reading) {
    return (
      <Card className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
        <Droplets className="h-5 w-5 shrink-0" />
        No live Arduino reading yet. Start the serial bridge after uploading the Aqualert
        sketch and readings will appear here.
      </Card>
    );
  }
  const leaky = /leak|critical|fault/i.test(reading.status);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Droplets className="h-5 w-5" />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Live tank reading · {reading.location}
            </p>
            <p className="font-display text-3xl font-extrabold tracking-tight nums">
              {fmtNum(reading.fill_percent, 1)}%
            </p>
          </div>
        </div>
        {leaky ? (
          <Badge variant="destructive" className="uppercase">
            {reading.status}
          </Badge>
        ) : (
          <Badge variant="outline" className="uppercase">
            {reading.status}
          </Badge>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "Distance", v: `${fmtNum(reading.distance_cm, 1)} cm` },
          { k: "Confidence", v: `${Math.round((reading.confidence ?? 0) * 100)}%` },
          { k: "Freshness", v: `${fmtNum(reading.freshness_seconds ?? 0, 0)}s ago` },
          { k: "Live", v: reading.is_live ? "yes" : "stale" },
        ].map((s) => (
          <div key={s.k} className="rounded-md border border-border p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {s.k}
            </p>
            <p className="mt-0.5 font-mono text-sm nums">{s.v}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function WaterPage() {
  const [sensor, setSensor] = React.useState<WaterLiveReading | null>(null);

  // Poll the live Aqualert feed so each new calculation refreshes the card.
  React.useEffect(() => {
    let active = true;
    const poll = () =>
      getWaterLive().then(({ live_sensor }) => active && setSensor(live_sensor));
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const rows = React.useMemo(
    () => sortNewest(waterFallback, (r) => r.timestamp),
    []
  );
  const criticalCount = rows.filter(isCritical).length;

  const columns: Column<WaterRow>[] = [
    { key: "location", header: "Location", cell: (r) => <span className="font-medium">{r.location}</span> },
    { key: "state", header: "State", cell: (r) => stateBadge(r.state) },
    {
      key: "confidence",
      header: "Confidence",
      mono: true,
      className: "text-right",
      cell: (r) => `${r.confidence.toFixed(1)}%`,
    },
    {
      key: "decline",
      header: "Decline (cm/hr)",
      mono: true,
      className: "text-right",
      cell: (r) => r.declineCmHr.toFixed(2),
    },
    { key: "time", header: "Logged", mono: true, cell: (r) => fmtDateTime(r.timestamp) },
  ];

  return (
    <DashboardShell
      title="Water Usage"
      subtitle="Aqualert leak verification"
      criticalLabel={`${criticalCount} leak suspected`}
    >
      <LiveSensorCard reading={sensor} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r, i) => `${r.id}-${i}`}
        isCritical={isCritical}
        rowClassName={rowTint}
        empty="No water logs available."
      />
    </DashboardShell>
  );
}

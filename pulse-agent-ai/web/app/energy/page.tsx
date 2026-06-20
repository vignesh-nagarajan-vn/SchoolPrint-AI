"use client";

import * as React from "react";

import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { energyFallback } from "@/lib/api";
import { fmtDateTime, sortNewest } from "@/lib/format";
import type { EnergyRow } from "@/lib/types";

const wastedKwh = (r: EnergyRow) => r.actualKwh - r.expectedKwh;

// Wasted (Actual − Expected) over 100 kWh → full-row RED critical highlight.
const isCritical = (r: EnergyRow) => wastedKwh(r) > 100;

export default function EnergyPage() {
  const rows = React.useMemo(
    () => sortNewest(energyFallback, (r) => r.timestamp),
    []
  );
  const criticalCount = rows.filter(isCritical).length;

  const columns: Column<EnergyRow>[] = [
    { key: "zone", header: "Zone", cell: (r) => <span className="font-medium">{r.zone}</span> },
    { key: "time", header: "Time", mono: true, cell: (r) => fmtDateTime(r.timestamp) },
    {
      key: "expected",
      header: "Expected Energy Consumption (kWh)",
      mono: true,
      className: "text-right",
      cell: (r) => r.expectedKwh.toFixed(2),
    },
    {
      key: "actual",
      header: "Actual Energy Consumption (kWh)",
      mono: true,
      className: "text-right",
      cell: (r) => r.actualKwh.toFixed(2),
    },
    {
      key: "wasted",
      header: "Wasted (kWh)",
      mono: true,
      className: "text-right",
      cell: (r) => {
        const w = wastedKwh(r);
        return (
          <span className={w > 0 ? "font-semibold" : "text-muted-foreground"}>
            {w > 0 ? "+" : ""}
            {w.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => {
        const w = wastedKwh(r);
        if (w > 100) return <Badge variant="destructive">Critical</Badge>;
        if (r.wastedFlag) return <Badge variant="secondary">Flagged</Badge>;
        return (
          <Badge variant="outline" className="border-gray-300 bg-gray-100 text-gray-500">
            OK
          </Badge>
        );
      },
    },
  ];

  return (
    <DashboardShell
      title="Energy Consumption"
      subtitle="Energy Zone Log"
      criticalLabel={`${criticalCount} over 100 kWh wasted`}
    >
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r, i) => `${r.id}-${i}`}
        isCritical={isCritical}
        empty="No energy logs available."
      />
    </DashboardShell>
  );
}

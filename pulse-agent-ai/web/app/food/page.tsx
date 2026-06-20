"use client";

import * as React from "react";

import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { foodFallback, getWasteLive } from "@/lib/api";
import { fmtDateTime, sortNewest } from "@/lib/format";
import type { FoodRow } from "@/lib/types";

// Compost AI low-confidence sort → full-row RED critical highlight.
const isCritical = (r: FoodRow) => r.confidence < 30;

export default function FoodPage() {
  const [live, setLive] = React.useState<FoodRow[]>([]);

  // Poll the live waste feed so newly sorted Compost AI items appear at the top.
  React.useEffect(() => {
    let active = true;
    const poll = () => getWasteLive().then((rows) => active && setLive(rows));
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const rows = React.useMemo(() => {
    const liveIds = new Set(live.map((r) => r.id));
    const merged = [...live, ...foodFallback.filter((r) => !liveIds.has(r.id))];
    return sortNewest(merged, (r) => r.timestamp);
  }, [live]);

  const criticalCount = rows.filter(isCritical).length;

  const columns: Column<FoodRow>[] = [
    {
      key: "item",
      header: "Item",
      cell: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-medium capitalize">{r.item?.replace(/_/g, " ")}</span>
          {r.isLive && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] uppercase">
              live
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "bin",
      header: "Disposal Bin",
      cell: (r) => (
        <span
          className={
            /compost/i.test(r.bin)
              ? "font-semibold text-amber-800"
              : "font-semibold text-green-600"
          }
        >
          {r.bin}
        </span>
      ),
    },
    { key: "location", header: "Location", cell: (r) => r.location },
    {
      key: "confidence",
      header: "Confidence",
      mono: true,
      className: "text-right",
      cell: (r) => `${r.confidence.toFixed(1)}%`,
    },
    {
      key: "time",
      header: "Logged",
      mono: true,
      cell: (r) => fmtDateTime(r.timestamp),
    },
  ];

  return (
    <DashboardShell
      title="Food Consumption"
      subtitle="Compost AI sorting log"
      criticalLabel={`${criticalCount} low-confidence (<30%)`}
    >
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r, i) => `${r.id}-${i}`}
        isCritical={isCritical}
        empty="No waste logs available."
      />
    </DashboardShell>
  );
}

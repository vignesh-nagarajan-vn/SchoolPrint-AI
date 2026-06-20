"use client";

import * as React from "react";
import { Loader2, Utensils } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eventsFallback, getEventPlan } from "@/lib/api";
import { fmtDate, toEpoch } from "@/lib/format";
import type { EventPlan, EventRow } from "@/lib/types";

const EVENT_TYPES = [
  { value: "sports", label: "Sports" },
  { value: "competition", label: "Competition" },
  { value: "assembly", label: "Assembly" },
  { value: "family_night", label: "Family night" },
  { value: "club", label: "Club" },
];

function ForecastCard({ plan, live }: { plan: EventPlan; live: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Utensils className="h-4 w-4" /> Forecast
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {live ? "model" : "offline estimate"}
        </span>
      </div>
      <div className="grid gap-4 pt-4 sm:grid-cols-[auto,1fr] sm:items-center">
        <div className="sm:pr-6 sm:border-r sm:border-border">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Recommended servings
          </p>
          <p className="font-display text-5xl font-extrabold tracking-tight nums">
            {plan.recommended_servings.toLocaleString()}
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p>{plan.energy_note}</p>
          <p>{plan.waste_note}</p>
          <p className="text-xs text-muted-foreground">{plan.human_check}</p>
        </div>
      </div>
    </Card>
  );
}

export default function EventsPage() {
  const [eventType, setEventType] = React.useState("sports");
  const [attendance, setAttendance] = React.useState("250");
  const [duration, setDuration] = React.useState("3");
  const [plan, setPlan] = React.useState<EventPlan | null>(null);
  const [live, setLive] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const forecast = React.useCallback(async () => {
    setBusy(true);
    try {
      const res = await getEventPlan(
        eventType,
        parseInt(attendance, 10) || 0,
        parseFloat(duration) || 0
      );
      setPlan(res.data);
      setLive(res.live);
    } finally {
      setBusy(false);
    }
  }, [eventType, attendance, duration]);

  // Initial forecast on mount.
  React.useEffect(() => {
    forecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = React.useMemo(
    () => [...eventsFallback].sort((a, b) => toEpoch(b.date) - toEpoch(a.date)),
    []
  );

  const columns: Column<EventRow>[] = [
    { key: "name", header: "Event", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "category", header: "Category", cell: (r) => <span className="capitalize">{r.category}</span> },
    { key: "date", header: "Date", mono: true, cell: (r) => fmtDate(r.date) },
    { key: "room", header: "Room", cell: (r) => r.room },
    {
      key: "attendance",
      header: "Attendance",
      mono: true,
      className: "text-right",
      cell: (r) => `${r.actualAttendance}/${r.expectedAttendance}`,
    },
    {
      key: "wasted",
      header: "Food Wasted",
      mono: true,
      className: "text-right",
      cell: (r) => r.foodWasted.toLocaleString(),
    },
    {
      key: "energy",
      header: "Energy (kWh)",
      mono: true,
      className: "text-right",
      cell: (r) => r.energyKwh.toFixed(1),
    },
  ];

  return (
    <DashboardShell title="Event Forecasting" subtitle="Event Planner">
      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr,1fr,1fr,auto] sm:items-end">
          <label className="space-y-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Event type
            </span>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Attendance
            </span>
            <Input
              type="number"
              min={10}
              max={1200}
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Hours
            </span>
            <Input
              type="number"
              min={1}
              max={8}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
          <Button onClick={forecast} disabled={busy} className="h-11">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Forecast
          </Button>
        </div>
      </Card>

      {plan && <ForecastCard plan={plan} live={live} />}

      <div>
        <h3 className="mb-3 font-display text-lg font-bold tracking-tight">Event history</h3>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r, i) => `${r.id}-${i}`}
          empty="No event history available."
        />
      </div>
    </DashboardShell>
  );
}

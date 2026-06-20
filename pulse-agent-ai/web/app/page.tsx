"use client";

import * as React from "react";

import { VoiceAgent } from "@/components/voice-agent";
import { ActionCardView } from "@/components/action-card";
import { getOverview } from "@/lib/api";
import { fmtNum } from "@/lib/format";
import type { ActionCard, ImpactTotals } from "@/lib/types";

// High priority first, then by confidence.
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
function byPriority(a: ActionCard, b: ActionCard): number {
  const ra = PRIORITY_RANK[a.priority?.toLowerCase()] ?? 1;
  const rb = PRIORITY_RANK[b.priority?.toLowerCase()] ?? 1;
  return ra - rb || b.confidence - a.confidence;
}

function ImpactStrip({ totals, live }: { totals: ImpactTotals; live: boolean }) {
  const stats = [
    { label: "Events", value: fmtNum(totals.events_analyzed), unit: "analyzed" },
    { label: "Food Wasted", value: fmtNum(totals.food_waste_lbs_logged, 1), unit: "lb logged" },
    { label: "Water Leaked", value: fmtNum(totals.open_water_gallons_at_risk, 1), unit: "gallons" },
    { label: "Energy Lost", value: fmtNum(totals.estimated_wasted_kwh, 1), unit: "kWh" },
  ];
  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-bold text-foreground">
          School Environmental Footprint Summary
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {live ? "live" : "offline sample"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border-2 border-foreground bg-card p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold tracking-tight nums">
              {s.value}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">{s.unit}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [cards, setCards] = React.useState<ActionCard[]>([]);
  const [totals, setTotals] = React.useState<ImpactTotals | null>(null);
  const [live, setLive] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    getOverview().then(({ data, live }) => {
      setCards(data.top_action_cards);
      setTotals(data.impact_totals);
      setLive(live);
      setLoaded(true);
    });
  }, []);

  return (
    <div className="space-y-12">
      {/* Voice agent — centered hero */}
      <section className="rounded-2xl border border-border bg-card px-4 py-10 sm:px-8 sm:py-14">
        <VoiceAgent onCards={setCards} />
      </section>

      {totals && <ImpactStrip totals={totals} live={live} />}

      {/* Action cards */}
      <section>
        {cards.length ? (
          <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...cards].sort(byPriority).map((card, i) => (
              <ActionCardView key={`${card.module}-${i}`} card={card} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {loaded ? "No action cards right now." : "Loading action cards…"}
          </div>
        )}
      </section>
    </div>
  );
}

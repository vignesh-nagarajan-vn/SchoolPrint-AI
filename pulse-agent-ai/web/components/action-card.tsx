import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActionCard } from "@/lib/types";

// Module accent colors: Waste → green, Water → blue, Energy → purple.
function moduleColor(module: string): string {
  const m = (module ?? "").toLowerCase();
  if (m.includes("waste") || m.includes("food") || m.includes("compost"))
    return "text-green-600";
  if (m.includes("water")) return "text-blue-600";
  if (m.includes("energy")) return "text-purple-600";
  return "text-muted-foreground";
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Confidence</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function ActionCardView({ card }: { card: ActionCard }) {
  const high = card.priority?.toLowerCase() === "high";
  return (
    <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-mono text-[11px] font-semibold uppercase tracking-[0.18em]",
            moduleColor(card.module)
          )}
        >
          {card.module}
        </span>
        <Badge variant={high ? "default" : "outline"} className="uppercase tracking-wide">
          {card.priority}
        </Badge>
      </div>

      <h3 className="font-display text-lg font-bold leading-snug">{card.title}</h3>

      <div className="space-y-1.5 text-sm">
        <p>
          <span className="font-bold">LOCATION:</span> {card.location}
        </p>
        <p>
          <span className="font-bold">EVIDENCE:</span> {card.evidence}
        </p>
        <p>
          <span className="font-bold">ACTION:</span> {card.recommendation}
        </p>
        <p>
          <span className="font-bold">RISK:</span> {card.estimated_impact}
        </p>
      </div>

      <div className="mt-auto pt-1">
        <ConfidenceBar value={card.confidence} />
      </div>
    </Card>
  );
}

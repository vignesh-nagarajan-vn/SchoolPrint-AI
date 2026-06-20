import type {
  ActionCard,
  AgentResponse,
  EnergyRow,
  EventPlan,
  EventRow,
  FoodRow,
  Overview,
  WaterLiveReading,
  WaterRow,
} from "@/lib/types";

import foodData from "@/lib/fallback/food.json";
import waterData from "@/lib/fallback/water.json";
import energyData from "@/lib/fallback/energy.json";
import eventsData from "@/lib/fallback/events.json";

// Bundled synthetic logs — always available, used as the primary source for the
// dashboards and the offline fallback for the home overview.
export const foodFallback = foodData as FoodRow[];
export const waterFallback = waterData as WaterRow[];
export const energyFallback = energyData as EnergyRow[];
export const eventsFallback = eventsData as EventRow[];

async function fetchJSON<T>(url: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- Home overview (action cards + impact totals) ---------------- */

export async function getOverview(): Promise<{ data: Overview; live: boolean }> {
  try {
    const data = await fetchJSON<Overview>("/api/overview");
    if (data && Array.isArray(data.top_action_cards)) return { data, live: true };
    throw new Error("unexpected overview shape");
  } catch {
    return { data: computeFallbackOverview(), live: false };
  }
}

function binWeight(bin: string): number {
  const b = (bin ?? "").toLowerCase();
  if (b.includes("compost")) return 1.0;
  if (b.includes("recycl")) return 0.25;
  return 0.4;
}

// Derive a believable overview from the bundled logs when the backend is down.
export function computeFallbackOverview(): Overview {
  const wastedKwh = energyFallback.reduce(
    (sum, r) => sum + Math.max(0, r.actualKwh - r.expectedKwh),
    0
  );
  const openGallons = waterFallback
    .filter((r) => /leak|attention/i.test(r.state))
    .reduce((sum, r) => sum + Math.abs(r.declineCmHr) * 80, 0);
  const foodLbs = foodFallback.reduce((sum, r) => sum + binWeight(r.bin), 0);

  const cards: ActionCard[] = [];

  [...energyFallback]
    .map((r) => ({ r, w: r.actualKwh - r.expectedKwh }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, 2)
    .forEach(({ r, w }) =>
      cards.push({
        module: "Energy",
        priority: w >= 8 ? "high" : "medium",
        title: "After-hours energy spike",
        location: r.zone,
        recommendation: "Check the room schedule, lights, HVAC setpoint, and event teardown.",
        evidence: `${r.actualKwh.toFixed(1)} kWh actual vs ${r.expectedKwh.toFixed(1)} kWh expected.`,
        estimated_impact: `About ${w.toFixed(1)} kWh over expected this hour.`,
        confidence: Math.min(0.98, 0.72 + w / 40),
        human_check: "Facilities confirms whether the room was actually occupied.",
      })
    );

  waterFallback
    .filter((r) => /leak/i.test(r.state))
    .slice(0, 2)
    .forEach((r) =>
      cards.push({
        module: "Water",
        priority: "high",
        title: `Possible leak at ${r.location}`,
        location: r.location,
        recommendation: "Send a custodian to check the fixture before opening a repair ticket.",
        evidence: `Decline ${r.declineCmHr.toFixed(2)} cm/hr, confidence ${r.confidence.toFixed(0)}%.`,
        estimated_impact: `About ${(Math.abs(r.declineCmHr) * 80).toFixed(0)} gallons at risk.`,
        confidence: Math.min(0.99, r.confidence / 100),
        human_check: "Custodian confirms a visible leak before escalation.",
      })
    );

  foodFallback
    .filter((r) => r.confidence < 30)
    .slice(0, 2)
    .forEach((r) =>
      cards.push({
        module: "Waste",
        priority: "medium",
        title: `Review ${r.item} sorting decision`,
        location: r.location,
        recommendation: "Ask the green-team reviewer to confirm the bin label and update the log.",
        evidence: `Bin=${r.bin}, confidence ${r.confidence.toFixed(0)}%.`,
        estimated_impact: "Improves compost/recycling accuracy.",
        confidence: Math.max(0.5, 1 - r.confidence / 100),
        human_check: "A human reviewer confirms or corrects the sort.",
      })
    );

  cards.sort((a, b) => b.confidence - a.confidence);

  return {
    impact_totals: {
      estimated_wasted_kwh: Math.round(wastedKwh * 10) / 10,
      open_water_gallons_at_risk: Math.round(openGallons * 10) / 10,
      food_waste_lbs_logged: Math.round(foodLbs * 10) / 10,
      events_analyzed: eventsFallback.length,
    },
    top_action_cards: cards.slice(0, 6),
  };
}

/* ---------------- Live feeds (Aqualert water + Compost AI sorts) ---------------- */

export async function getWaterLive(): Promise<{
  live_sensor: WaterLiveReading | null;
  live_history: WaterLiveReading[];
}> {
  try {
    return await fetchJSON("/api/water/live");
  } catch {
    return { live_sensor: null, live_history: [] };
  }
}

export async function getWasteLive(): Promise<FoodRow[]> {
  try {
    const data = await fetchJSON<{ rows: FoodRow[] }>("/api/waste/live");
    return (data.rows ?? []).map((r) => ({ ...r, isLive: true }));
  } catch {
    return [];
  }
}

/* ---------------- Event forecasting ---------------- */

export async function getEventPlan(
  eventType: string,
  attendance: number,
  durationHr: number
): Promise<{ data: EventPlan; live: boolean }> {
  const qs = `event_type=${encodeURIComponent(eventType)}&expected_attendance=${attendance}&duration_hr=${durationHr}`;
  try {
    const data = await fetchJSON<EventPlan>(`/api/event-plan?${qs}`);
    return { data, live: true };
  } catch {
    return {
      data: {
        event_type: eventType,
        expected_attendance: attendance,
        recommended_servings: Math.max(0, Math.round(attendance * 0.9)),
        energy_note:
          "Schedule HVAC/lights to start 45 min before arrival and shut down 20 min after teardown.",
        waste_note:
          "Log actual attendance, leftovers, compost, and trash after the event to improve the next forecast.",
        human_check:
          "Event lead reviews the order and facilities schedule before anything is purchased.",
      },
      live: false,
    };
  }
}

/* ---------------- Voice agent ---------------- */

export async function askAgent(query: string, language: string): Promise<AgentResponse> {
  return fetchJSON<AgentResponse>(
    "/api/agent/query",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, language, voice_mode: true }),
    },
    30000
  );
}

export async function voiceConfigured(): Promise<boolean> {
  try {
    const status = await fetchJSON<{ configured?: boolean }>("/api/voice/status");
    return Boolean(status.configured);
  } catch {
    return false;
  }
}

export async function speak(text: string, language: string): Promise<Blob | null> {
  try {
    const res = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
    });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

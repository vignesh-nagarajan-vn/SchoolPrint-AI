// Shapes for the synthetic logs (bundled from data/synthetic/*.csv via
// scripts/gen-fallback.mjs) and for the live FastAPI /api/* responses.

export interface FoodRow {
  id: string;
  timestamp: string; // raw CSV timestamp string
  location: string;
  item: string; // Waste Item
  bin: string; // Disposal Bin: Compost / Recycling / Garbage / Landfill
  confidence: number; // 0–100
  isLive?: boolean; // true for items pushed live via /api/waste/live
}

export interface WaterRow {
  id: string;
  timestamp: string;
  location: string;
  state: string; // Healthy / Attention needed / Leaking
  confidence: number; // 0–100
  declineCmHr: number; // Water Decline (cm/hr)
}

export interface EnergyRow {
  id: string;
  timestamp: string;
  zone: string;
  hour: number;
  weekday: number;
  outdoorTempF: number;
  expectedOccupancy: number;
  expectedKwh: number;
  actualKwh: number;
  wastedFlag: number; // raw Wasted? flag (0/1)
}

export interface EventRow {
  id: string;
  date: string;
  name: string;
  category: string;
  startTime: string;
  durationHr: number;
  room: string;
  expectedAttendance: number;
  actualAttendance: number;
  foodServings: number;
  foodWasted: number;
  energyKwh: number;
}

// /api/overview top_action_cards + analytics.ActionCard
export interface ActionCard {
  module: string;
  priority: string;
  title: string;
  location: string;
  recommendation: string;
  evidence: string;
  estimated_impact: string;
  confidence: number; // 0–1
  human_check: string;
}

export interface ImpactTotals {
  estimated_wasted_kwh: number;
  open_water_gallons_at_risk: number;
  food_waste_lbs_logged: number;
  events_analyzed: number;
}

export interface Overview {
  impact_totals: ImpactTotals;
  top_action_cards: ActionCard[];
}

// GET /api/water/live
export interface WaterLiveReading {
  location: string;
  fill_percent: number;
  distance_cm: number;
  fill_depth_cm?: number;
  status: string;
  confidence: number; // 0–1
  recorded_at: string;
  freshness_seconds?: number;
  is_live?: boolean;
  spread_cm?: number;
}

// GET /api/event-plan
export interface EventPlan {
  event_type: string;
  expected_attendance: number;
  recommended_servings: number;
  energy_note: string;
  waste_note: string;
  human_check: string;
}

// POST /api/agent/query
export interface AgentResponse {
  answer: string;
  action_cards: ActionCard[];
  citations: Array<Record<string, unknown>>;
  used_llm: boolean;
}

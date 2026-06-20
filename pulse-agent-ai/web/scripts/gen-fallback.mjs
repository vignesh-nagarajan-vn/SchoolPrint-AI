// Converts the synthetic CSV logs into committed JSON the web app bundles as a
// static fallback (so the dashboards render even if the FastAPI backend is down).
//
//   node scripts/gen-fallback.mjs
//
// Reads  pulse-agent-ai/data/synthetic/{waste,water,energy,event}_logs.csv
// Writes pulse-agent-ai/web/lib/fallback/{food,water,energy,events}.json

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SYNTH = resolve(here, "..", "..", "data", "synthetic");
const OUT = resolve(here, "..", "lib", "fallback");
mkdirSync(OUT, { recursive: true });

function parseCsv(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.length > 0);
  const parseLine = (line) => {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') {
          inQ = false;
        } else {
          cur += c;
        }
      } else if (c === '"') {
        inQ = true;
      } else if (c === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = lines.length ? parseLine(lines[0]) : [];
  const rows = lines.slice(1).map(parseLine);
  return { header, rows };
}

const pct = (v) => {
  const n = parseFloat(String(v ?? "").replace("%", ""));
  return Number.isFinite(n) ? n : 0;
};
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Find a column index: exact header match first, then substring (handles the
// "°F" degree sign and minor header drift).
function find(header, ...candidates) {
  for (const c of candidates) {
    const exact = header.indexOf(c);
    if (exact !== -1) return exact;
  }
  for (const c of candidates) {
    const idx = header.findIndex((h) => h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

const load = (name) => parseCsv(readFileSync(join(SYNTH, name), "utf8"));
const emit = (name, data) => {
  writeFileSync(join(OUT, name), JSON.stringify(data));
  console.log(`${name}: ${data.length} rows`);
};

// waste_logs -> food.json
{
  const { header, rows } = load("waste_logs.csv");
  const c = {
    id: find(header, "ID"),
    ts: find(header, "Timestamp"),
    loc: find(header, "Location"),
    item: find(header, "Waste Item", "Item"),
    bin: find(header, "Disposal Bin", "Bin"),
    conf: find(header, "Confidence Level", "Confidence"),
  };
  emit(
    "food.json",
    rows.map((r) => ({
      id: r[c.id],
      timestamp: r[c.ts],
      location: r[c.loc],
      item: r[c.item],
      bin: r[c.bin],
      confidence: pct(r[c.conf]),
    }))
  );
}

// water_logs -> water.json
{
  const { header, rows } = load("water_logs.csv");
  const c = {
    id: find(header, "ID"),
    ts: find(header, "Timestamp"),
    loc: find(header, "Location"),
    state: find(header, "State"),
    conf: find(header, "Confidence Level", "Confidence"),
    decl: find(header, "Water Decline (cm/hr)", "Water Decline"),
  };
  emit(
    "water.json",
    rows.map((r) => ({
      id: r[c.id],
      timestamp: r[c.ts],
      location: r[c.loc],
      state: r[c.state],
      confidence: pct(r[c.conf]),
      declineCmHr: num(r[c.decl]),
    }))
  );
}

// energy_logs -> energy.json
{
  const { header, rows } = load("energy_logs.csv");
  const c = {
    id: find(header, "ID"),
    ts: find(header, "Timestamp"),
    zone: find(header, "Zone"),
    hour: find(header, "Hour"),
    weekday: find(header, "Weekday"),
    temp: find(header, "Outdoor Temperature"),
    occ: find(header, "Expected Occupancy"),
    exp: find(header, "Expected Energy Consumption (kwh)", "Expected Energy"),
    act: find(header, "Actual Energy Consumption (kwh)", "Actual Energy"),
    waste: find(header, "Wasted?", "Wasted"),
  };
  emit(
    "energy.json",
    rows.map((r) => ({
      id: r[c.id],
      timestamp: r[c.ts],
      zone: r[c.zone],
      hour: num(r[c.hour]),
      weekday: num(r[c.weekday]),
      outdoorTempF: num(r[c.temp]),
      expectedOccupancy: num(r[c.occ]),
      expectedKwh: num(r[c.exp]),
      actualKwh: num(r[c.act]),
      wastedFlag: num(r[c.waste]),
    }))
  );
}

// event_logs -> events.json
{
  const { header, rows } = load("event_logs.csv");
  const c = {
    id: find(header, "ID"),
    date: find(header, "Date"),
    name: find(header, "Name"),
    cat: find(header, "Event Category", "Category"),
    start: find(header, "Start Time"),
    dur: find(header, "Duration"),
    room: find(header, "Room"),
    exp: find(header, "Expected Attendance"),
    act: find(header, "Actual Attendance"),
    serv: find(header, "Food Servings Count"),
    wasted: find(header, "Food Wasted Count"),
    energy: find(header, "Energy Consumption (kwh)", "Energy Consumption"),
  };
  emit(
    "events.json",
    rows.map((r) => ({
      id: r[c.id],
      date: r[c.date],
      name: r[c.name],
      category: r[c.cat],
      startTime: r[c.start],
      durationHr: num(r[c.dur]),
      room: r[c.room],
      expectedAttendance: num(r[c.exp]),
      actualAttendance: num(r[c.act]),
      foodServings: num(r[c.serv]),
      foodWasted: num(r[c.wasted]),
      energyKwh: num(r[c.energy]),
    }))
  );
}

console.log("Fallback JSON written to lib/fallback/");

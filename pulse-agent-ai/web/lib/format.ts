// Timestamp + number formatting shared across dashboards.
// The synthetic logs use two timestamp formats:
//   "MM-DD-YYYY HH:MM:SS" (waste/water), "MM-DD-YYYY" (events)
//   ISO "YYYY-MM-DDTHH:MM:SS" (energy)

export function toEpoch(ts: string): number {
  if (!ts) return 0;
  if (ts.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(ts)) {
    const t = Date.parse(ts);
    return Number.isNaN(t) ? 0 : t;
  }
  const [datePart, timePart] = ts.split(" ");
  const [mm, dd, yyyy] = datePart.split("-").map((n) => parseInt(n, 10));
  let h = 0;
  let mi = 0;
  let s = 0;
  if (timePart) {
    const parts = timePart.split(":").map((n) => parseInt(n, 10));
    h = parts[0] || 0;
    mi = parts[1] || 0;
    s = parts[2] || 0;
  }
  const d = new Date(yyyy || 1970, (mm || 1) - 1, dd || 1, h, mi, s);
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function fmtDateTime(ts: string): string {
  const e = toEpoch(ts);
  if (!e) return ts || "—";
  return new Date(e).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtDate(ts: string): string {
  const e = toEpoch(ts);
  if (!e) return ts || "—";
  return new Date(e).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Sort a copy newest-first by a timestamp accessor.
export function sortNewest<T>(rows: T[], getTs: (row: T) => string): T[] {
  return [...rows].sort((a, b) => toEpoch(getTs(b)) - toEpoch(getTs(a)));
}

export function fmtNum(value: number, digits = 0): string {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

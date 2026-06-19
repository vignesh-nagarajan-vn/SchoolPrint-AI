import { NextRequest, NextResponse } from "next/server";

// Proxy /api/predict -> {HF_SPACE_URL}/predict. Keeps the Space URL/token
// server-side and sidesteps browser CORS. The browser only calls same-origin.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPACE_URL = process.env.HF_SPACE_URL ?? "http://localhost:7860";
const HF_TOKEN = process.env.HF_TOKEN;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${SPACE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
      // Cold HF Spaces can take a while to wake; allow generous time.
      signal: AbortSignal.timeout(90_000),
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json(
      { error: `Inference backend unreachable: ${message}` },
      { status: 502 }
    );
  }
}

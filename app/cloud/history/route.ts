import { NextResponse } from "next/server";
import { getThreshold, insertReading, recentReadings } from "@/lib/db";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

type BoardPayload = {
  station?: unknown;
  temperature?: unknown;
  humidity?: unknown;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/** The board writes here. The reply carries the threshold it should compare against. */
export async function POST(request: Request) {
  let payload: BoardPayload;

  try {
    payload = (await request.json()) as BoardPayload;
  } catch {
    return NextResponse.json(
      { error: "body must be valid JSON" },
      { status: 400, headers: NO_STORE },
    );
  }

  const station = typeof payload.station === "string" ? payload.station.trim() : "";
  const temperature = asNumber(payload.temperature);
  const humidity = payload.humidity === undefined || payload.humidity === null
    ? null
    : asNumber(payload.humidity);

  if (station.length === 0 || station.length > 64) {
    return NextResponse.json(
      { error: "station must be a non-empty string of at most 64 characters" },
      { status: 400, headers: NO_STORE },
    );
  }

  if (temperature === null || temperature < -90 || temperature > 60) {
    return NextResponse.json(
      { error: "temperature must be a number between -90 and 60" },
      { status: 400, headers: NO_STORE },
    );
  }

  if (humidity !== null && (humidity < 0 || humidity > 100)) {
    return NextResponse.json(
      { error: "humidity must be between 0 and 100" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    await insertReading(station, temperature, humidity);
    const threshold = await getThreshold();

    return NextResponse.json({ ok: true, threshold_c: threshold }, { headers: NO_STORE });
  } catch (error) {
    console.error("POST /cloud/history failed", error);
    return NextResponse.json(
      { error: "could not store the reading" },
      { status: 500, headers: NO_STORE },
    );
  }
}

/** The page reads here: newest first, each with its timestamp. */
export async function GET(request: Request) {
  const limitParam = new URL(request.url).searchParams.get("limit");
  const parsed = limitParam === null ? 120 : Number(limitParam);
  const limit = Number.isFinite(parsed) ? Math.min(500, Math.max(1, Math.trunc(parsed))) : 120;

  try {
    const [readings, threshold] = await Promise.all([recentReadings(limit), getThreshold()]);
    return NextResponse.json({ readings, threshold_c: threshold }, { headers: NO_STORE });
  } catch (error) {
    console.error("GET /cloud/history failed", error);
    return NextResponse.json(
      { error: "could not read the readings" },
      { status: 500, headers: NO_STORE },
    );
  }
}

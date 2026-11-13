import { NextResponse } from "next/server";
import { getForecast } from "@/lib/forecast";

export const revalidate = 1800;

/** Five days of highs and lows, fetched server-side and cached for 30 minutes. */
export async function GET() {
  try {
    return NextResponse.json({ daily: await getForecast() });
  } catch (error) {
    console.error("GET /cloud/forecast failed", error);
    return NextResponse.json({ error: "forecast unavailable" }, { status: 502 });
  }
}

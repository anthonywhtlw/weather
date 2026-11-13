import { NextResponse } from "next/server";
import { getThreshold, setThreshold } from "@/lib/db";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** The page writes the number the board compares its reading against. */
export async function POST(request: Request) {
  let payload: { threshold_c?: unknown };

  try {
    payload = (await request.json()) as { threshold_c?: unknown };
  } catch {
    return NextResponse.json(
      { error: "body must be valid JSON" },
      { status: 400, headers: NO_STORE },
    );
  }

  const value =
    typeof payload.threshold_c === "number"
      ? payload.threshold_c
      : Number(payload.threshold_c);

  if (!Number.isFinite(value) || value < -40 || value > 60) {
    return NextResponse.json(
      { error: "threshold_c must be a number between -40 and 60" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const threshold = await setThreshold(value);
    return NextResponse.json({ ok: true, threshold_c: threshold }, { headers: NO_STORE });
  } catch (error) {
    console.error("POST /cloud/threshold failed", error);
    return NextResponse.json(
      { error: "could not save the threshold" },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({ threshold_c: await getThreshold() }, { headers: NO_STORE });
  } catch (error) {
    console.error("GET /cloud/threshold failed", error);
    return NextResponse.json(
      { error: "could not read the threshold" },
      { status: 500, headers: NO_STORE },
    );
  }
}

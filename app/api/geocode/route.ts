import { NextResponse } from "next/server";

type OpenMeteoPlace = {
  id?: number;
  name?: string;
  admin1?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

type Place = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

/** City search for the location picker, proxied so the API key-free service is called server-side. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ places: [] });
  }

  if (query.length > 100) {
    return NextResponse.json({ places: [], error: "Query too long" }, { status: 400 });
  }

  const params = new URLSearchParams({
    name: query,
    count: "6",
    language: "en",
    format: "json",
  });

  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      throw new Error(`Geocoding responded with ${response.status}`);
    }

    const data = (await response.json()) as { results?: OpenMeteoPlace[] };

    const places: Place[] = (data.results ?? [])
      .filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number")
      .map((place) => ({
        id: place.id ?? 0,
        name: place.name ?? "Unknown",
        admin1: place.admin1,
        country: place.country,
        latitude: place.latitude as number,
        longitude: place.longitude as number,
      }));

    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [], error: "Geocoding unavailable" }, { status: 502 });
  }
}

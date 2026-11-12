"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Place = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

const SECONDARY = "text-slate-400";
const ROW =
  "flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none";

export default function LocationSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    setMessage(null);

    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Lookup failed");

        const data = (await response.json()) as { places?: Place[] };
        const places = data.places ?? [];

        setResults(places);
        setOpen(true);
        if (places.length === 0) setMessage("No matching place found.");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setResults([]);
        setOpen(false);
        setMessage("Couldn't search for places right now.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function navigateTo(latitude: number, longitude: number, name: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    setMessage(null);
    router.push(
      `/?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}&name=${encodeURIComponent(name)}`,
    );
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setMessage("This browser can't share your location.");
      return;
    }

    setLocating(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        navigateTo(position.coords.latitude, position.coords.longitude, "My location");
      },
      () => {
        setLocating(false);
        setMessage("Couldn't get your location.");
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div ref={containerRef} className="relative w-full sm:w-80">
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur focus-within:border-white/35">
        <span aria-hidden className="text-slate-400">
          ⌕
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Search a city…"
          aria-label="Search for a city"
          aria-expanded={open}
          className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
        />
        {loading && <span className="text-xs text-slate-400">…</span>}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 px-1">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="text-xs font-medium text-sky-300 underline-offset-4 hover:underline disabled:opacity-60"
        >
          {locating ? "Locating…" : "Use my location"}
        </button>
        {message && (
          <p role="status" className={`truncate text-xs ${SECONDARY}`}>
            {message}
          </p>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-1 shadow-2xl backdrop-blur"
        >
          {results.map((place) => (
            <li key={`${place.id}-${place.latitude}-${place.longitude}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className={ROW}
                onClick={() =>
                  navigateTo(
                    place.latitude,
                    place.longitude,
                    [place.name, place.admin1, place.country].filter(Boolean).join(", "),
                  )
                }
              >
                <span className="font-medium text-white">{place.name}</span>
                <span className={`text-xs ${SECONDARY}`}>
                  {[place.admin1, place.country].filter(Boolean).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

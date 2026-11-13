# Weather

A tiny [Next.js](https://nextjs.org) app that shows the **current temperature and humidity**
for any city in the world. Built to deploy on [Vercel](https://vercel.com) with zero configuration
and **no API keys**.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Vercel](https://img.shields.io/badge/deploy-Vercel-black)

**Live:** <https://weather-one-virid.vercel.app>

## What it does

- Current temperature in °F and °C, plus "feels like"
- Current relative humidity with a comfort read ("Comfortable", "Humid", …)
- Condition summary and wind speed
- City search with autocomplete, or use the browser's location
- Server-rendered and cached for 60 seconds, so it stays fast and cheap

The default location is Medford, MA. Any location can be linked directly:

```
/?lat=42.3584&lon=-71.0598&name=Boston%2C%20Massachusetts
```

## Data source

[Open-Meteo](https://open-meteo.com) — a free, keyless weather API. The forecast endpoint is called
from a server component, and city search goes through `/api/geocode` so the browser never talks to a
third party directly.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

```bash
npm run build   # production build
npm start       # serve the production build
npm run typecheck
```

Requires Node.js 20.9 or newer.

## Deploy to Vercel

No `vercel.json` or environment variables are needed — Vercel detects Next.js automatically.

**From the dashboard:** import this repository at
[vercel.com/new](https://vercel.com/new), keep the detected defaults, and deploy.

**From the CLI:**

```bash
npx vercel        # preview deployment
npx vercel --prod # production deployment
```

## Project layout

```
app/
  page.tsx              # home page — reads ?lat/?lon/?name and renders the readings
  layout.tsx            # document shell and metadata
  globals.css           # Tailwind entry point and page background
  api/geocode/route.ts  # city search proxy
components/
  location-search.tsx   # client-side place picker + geolocation button
lib/
  weather.ts            # Open-Meteo client, URL parsing, WMO code + humidity helpers
```
